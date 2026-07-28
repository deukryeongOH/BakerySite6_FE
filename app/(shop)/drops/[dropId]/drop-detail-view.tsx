"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ChevronLeft, Heart, MapPin } from "lucide-react";
import { COLORS } from "@/lib/theme";
import { BreadBox } from "@/components/bread-box";
import { DropBadge } from "@/components/drop-badge";
import { useAuth } from "@/lib/auth/auth-context";
import * as dropApi from "@/lib/api/drop";
import { ApiException } from "@/lib/api/types";
import { toDropStatus } from "@/lib/types";
import { pad, msToHMS, fmtDateTime, fmtPickup } from "@/lib/format";
import {
  EMPTY_WISHLIST,
  getWishlist,
  subscribeWishlist,
  toggleWishlist,
} from "@/lib/wishlist/wishlist-storage";

export function DropDetailView({ dropId, drop }: { dropId: number; drop: dropApi.DropInfo }) {
  const router = useRouter();
  const { memberId } = useAuth();
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const wishlist = useSyncExternalStore(
    subscribeWishlist,
    () => (memberId !== null ? getWishlist(memberId) : EMPTY_WISHLIST),
    () => EMPTY_WISHLIST,
  );
  const isHearted = wishlist.includes(dropId);

  // 대기열 순번 폴링을 시작했는지 여부만 로컬 상태로 두고, 나머지는 뮤테이션/쿼리 상태에서 그대로 파생한다
  // (effect 안에서 로컬 state를 직접 갱신하지 않기 위함).
  const [polling, setPolling] = useState(false);

  const status = toDropStatus(drop.dropStatus, drop.remainQuantity);
  const pct = drop.totalQuantity > 0 ? (drop.remainQuantity / drop.totalQuantity) * 100 : 0;

  const target =
    status === "SCHEDULED" ? new Date(drop.dropStart).getTime() : new Date(drop.dropEnd).getTime();
  const cd = msToHMS(target - now.getTime());

  const confirmMutation = useMutation({
    mutationFn: () => dropApi.confirmEntry(dropId),
    onSuccess: () => router.push(`/order?dropId=${dropId}`),
  });

  const enterMutation = useMutation({
    mutationFn: () => dropApi.enterQueue(dropId),
    onSuccess: (res) => {
      if (res.status === "ACTIVE") {
        confirmMutation.mutate();
      } else {
        setPolling(true);
      }
    },
  });

  const rankPollingEnabled =
    polling && !confirmMutation.isPending && !confirmMutation.isSuccess && !confirmMutation.isError;

  const rankQuery = useQuery({
    queryKey: ["queue-rank", dropId],
    queryFn: () => dropApi.getQueueRank(dropId),
    enabled: rankPollingEnabled,
    refetchInterval: 1000,
  });

  useEffect(() => {
    if (!rankPollingEnabled || rankQuery.data?.status !== "ACTIVE") return;
    confirmMutation.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rankQuery.data, rankPollingEnabled]);

  const purchasing = enterMutation.isPending || rankPollingEnabled || confirmMutation.isPending;
  const rank = rankQuery.data?.status === "WAITING" ? rankQuery.data.rank : null;

  const purchaseErrorMessage = enterMutation.isError
    ? enterMutation.error instanceof ApiException
      ? enterMutation.error.message
      : "대기열 진입에 실패했습니다."
    : confirmMutation.isError
      ? confirmMutation.error instanceof ApiException
        ? confirmMutation.error.message
        : "입장에 실패했습니다."
      : null;

  return (
    <div className="flex flex-col flex-1" style={{ background: COLORS.bg }}>
      {/* Hero */}
      <div className="relative flex-shrink-0" style={{ height: 300 }}>
        <BreadBox
          label={drop.name}
          className="absolute inset-0"
          src={drop.imageUrl}
          dim={status === "SOLD_OUT" || status === "CLOSED"}
        />

        {status === "SCHEDULED" && (
          <div
            className="absolute inset-0 flex flex-col items-center justify-center gap-2"
            style={{ background: "rgba(0,0,0,0.58)" }}
          >
            <p className="text-xs" style={{ color: "rgba(255,255,255,0.65)" }}>
              오픈까지
            </p>
            <span className="text-5xl font-bold tabular-nums font-mono" style={{ color: "#fff" }}>
              {pad(cd.h)}:{pad(cd.m)}:{pad(cd.s)}
            </span>
          </div>
        )}
        {status === "ON_SALE" && (
          <div
            className="absolute bottom-0 left-0 right-0 flex justify-between items-center px-4 py-2.5"
            style={{ background: "rgba(0,0,0,0.62)" }}
          >
            <span className="text-xs" style={{ color: "rgba(255,255,255,0.75)" }}>
              판매 마감까지
            </span>
            <span className="text-sm font-bold tabular-nums font-mono" style={{ color: COLORS.accent }}>
              {pad(cd.h)}:{pad(cd.m)}:{pad(cd.s)}
            </span>
          </div>
        )}
        {(status === "SOLD_OUT" || status === "CLOSED") && (
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{ background: "rgba(0,0,0,0.68)" }}
          >
            <div style={{ transform: "rotate(-12deg)" }}>
              <span
                className="text-2xl font-black tracking-[0.18em]"
                style={{
                  color: COLORS.disabled,
                  border: `3px solid ${COLORS.disabled}`,
                  padding: "8px 14px",
                  display: "block",
                }}
              >
                {status === "SOLD_OUT" ? "SOLD OUT" : "판매 종료"}
              </span>
            </div>
          </div>
        )}

        <button
          onClick={() => router.push("/")}
          className="absolute top-12 left-4 w-9 h-9 rounded-full flex items-center justify-center"
          style={{ background: "rgba(255,255,255,0.14)", backdropFilter: "blur(6px)" }}
          aria-label="뒤로가기"
        >
          <ChevronLeft size={20} color="#fff" />
        </button>
        <button
          onClick={() => memberId !== null && toggleWishlist(memberId, dropId)}
          disabled={memberId === null}
          className="absolute top-12 right-4 w-9 h-9 rounded-full flex items-center justify-center"
          style={{ background: "rgba(255,255,255,0.14)", backdropFilter: "blur(6px)" }}
          aria-label="찜하기"
        >
          <Heart
            size={18}
            color={isHearted ? COLORS.accent : "#fff"}
            fill={isHearted ? COLORS.accent : "none"}
          />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-4 pt-4 pb-3">
          <DropBadge status={status} />
          <h1 className="text-2xl font-bold mt-3 mb-1 leading-tight font-serif" style={{ color: COLORS.text }}>
            {drop.name}
          </h1>
          <p className="text-lg font-semibold mb-2" style={{ color: COLORS.text }}>
            {drop.price.toLocaleString()}원
          </p>
          <p className="text-sm leading-relaxed" style={{ color: COLORS.muted }}>
            {drop.description}
          </p>
        </div>

        <div
          className="mx-4 mb-3 rounded-xl overflow-hidden"
          style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}` }}
        >
          {[
            ["판매 오픈", fmtDateTime(drop.dropStart)],
            ["판매 마감", fmtDateTime(drop.dropEnd)],
          ].map(([l, v]) => (
            <div
              key={l}
              className="flex justify-between items-center px-4 py-3"
              style={{ borderBottom: `1px solid ${COLORS.border}` }}
            >
              <span className="text-sm" style={{ color: COLORS.muted }}>
                {l}
              </span>
              <span className="text-sm font-medium" style={{ color: COLORS.text }}>
                {v}
              </span>
            </div>
          ))}

          {status !== "CLOSED" && (
            <div className="px-4 py-3" style={{ borderBottom: `1px solid ${COLORS.border}` }}>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm" style={{ color: COLORS.muted }}>
                  남은 재고
                </span>
                {status === "SCHEDULED" ? (
                  <span className="text-xl font-bold font-serif" style={{ color: COLORS.accent }}>
                    {drop.totalQuantity}개 한정
                  </span>
                ) : (
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold" style={{ color: COLORS.accent }}>
                      {drop.remainQuantity}
                    </span>
                    <span className="text-xs" style={{ color: COLORS.muted }}>
                      / {drop.totalQuantity}
                    </span>
                  </div>
                )}
              </div>
              {status !== "SCHEDULED" && (
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: COLORS.border }}>
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${pct}%`, background: COLORS.accent }}
                  />
                </div>
              )}
            </div>
          )}

          <div className="flex justify-between items-center px-4 py-3">
            <span className="text-sm" style={{ color: COLORS.muted }}>
              1인 구매 제한
            </span>
            <span className="text-sm font-medium" style={{ color: COLORS.text }}>
              {drop.limitQuantity}개 (1회 주문만)
            </span>
          </div>
        </div>

        <div
          className="mx-4 mb-4 rounded-xl p-4"
          style={{ background: COLORS.accentSoft, border: `1px solid ${COLORS.border}` }}
        >
          <div className="flex items-center gap-2 mb-3">
            <MapPin size={15} color={COLORS.accent} />
            <span className="text-base font-semibold" style={{ color: COLORS.text }}>
              픽업 가능 날짜
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {drop.pickupDates.map((d) => (
              <span
                key={d}
                className="text-xs px-2.5 py-1 rounded-full"
                style={{ background: COLORS.bg, border: `1px solid ${COLORS.border}`, color: COLORS.text }}
              >
                {fmtPickup(d)}
              </span>
            ))}
          </div>
          <p
            className="text-xs mt-3 pt-3"
            style={{ color: COLORS.muted, borderTop: `1px solid ${COLORS.border}` }}
          >
            배송 없음, 매장 방문 수령만 가능
          </p>
        </div>
      </div>

      {/* CTA */}
      <div
        className="px-4 py-3 flex-shrink-0"
        style={{ background: COLORS.surface, borderTop: `1px solid ${COLORS.border}` }}
      >
        {purchaseErrorMessage && (
          <p className="text-xs mb-2 text-center" style={{ color: "#E0554F" }}>
            {purchaseErrorMessage}
          </p>
        )}

        {purchasing && (
          <div className="text-center py-2 mb-2">
            <p className="text-sm font-semibold" style={{ color: COLORS.accent }}>
              {rank && rank > 0 ? `대기 순번 ${rank}번` : "입장 처리 중..."}
            </p>
          </div>
        )}

        {status === "SCHEDULED" && (
          <button
            onClick={() => memberId !== null && toggleWishlist(memberId, dropId)}
            disabled={memberId === null}
            className="w-full py-3.5 rounded-lg text-sm font-semibold"
            style={{
              border: `1.5px solid ${isHearted ? COLORS.accent : COLORS.border}`,
              color: isHearted ? COLORS.accent : COLORS.text,
              background: "transparent",
            }}
          >
            {isHearted ? "♥ 찜 완료" : "찜하고 알림받기"}
          </button>
        )}
        {status === "ON_SALE" && (
          <button
            onClick={() => enterMutation.mutate()}
            disabled={purchasing}
            className="w-full py-3.5 rounded-lg text-sm font-bold disabled:opacity-60"
            style={{ background: COLORS.accent, color: COLORS.bg }}
          >
            구매하기
          </button>
        )}
        {(status === "SOLD_OUT" || status === "CLOSED") && (
          <button
            disabled
            className="w-full py-3.5 rounded-lg text-sm font-semibold cursor-not-allowed"
            style={{ background: COLORS.disabled, color: COLORS.muted }}
          >
            {status === "SOLD_OUT" ? "품절" : "종료된 드롭입니다"}
          </button>
        )}
      </div>
    </div>
  );
}
