"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Wallet } from "lucide-react";
import { COLORS } from "@/lib/theme";
import { BreadBox } from "@/components/bread-box";
import { DropBadge } from "@/components/drop-badge";
import * as dropApi from "@/lib/api/drop";
import * as paymentApi from "@/lib/api/payment";
import { ApiException } from "@/lib/api/types";
import { toDropStatus } from "@/lib/types";
import { pad, msToHMS, fmtDateTime } from "@/lib/format";

export default function HomePage() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const accountQuery = useQuery({
    queryKey: ["deposit-account"],
    queryFn: paymentApi.getDepositAccount,
  });

  const todayDropQuery = useQuery({
    queryKey: ["today-drop"],
    queryFn: dropApi.getTodayDropId,
    retry: false,
  });

  const noDropToday =
    todayDropQuery.isError &&
    todayDropQuery.error instanceof ApiException &&
    todayDropQuery.error.code === "C003";

  const dropInfoQuery = useQuery({
    queryKey: ["drop-info", todayDropQuery.data],
    queryFn: () => dropApi.getDropInfo(todayDropQuery.data!),
    enabled: todayDropQuery.data !== undefined,
  });

  const drop = dropInfoQuery.data;
  const status = drop ? toDropStatus(drop.dropStatus, drop.remainQuantity) : null;
  const target = drop
    ? status === "SCHEDULED"
      ? new Date(drop.dropStart).getTime()
      : new Date(drop.dropEnd).getTime()
    : null;
  const hms = target ? msToHMS(target - now.getTime()) : null;

  return (
    <div className="flex flex-col flex-1" style={{ background: COLORS.bg }}>
      <div
        className="flex items-center justify-between px-4 pb-3 flex-shrink-0"
        style={{ paddingTop: "max(3rem, env(safe-area-inset-top))" }}
      >
        <span className="text-2xl font-bold font-serif" style={{ color: COLORS.text }}>
          오픈베이크
        </span>
        <Link
          href="/wallet"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold"
          style={{
            background: COLORS.accentSoft,
            color: COLORS.accent,
            border: `1px solid ${COLORS.border}`,
          }}
        >
          <Wallet size={13} />
          {accountQuery.data ? `${accountQuery.data.balance.toLocaleString()}원` : "예치금"}
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto">
        {todayDropQuery.isLoading && (
          <p className="text-sm text-center mt-10" style={{ color: COLORS.muted }}>
            불러오는 중...
          </p>
        )}

        {noDropToday && (
          <div
            className="mx-4 mt-4 rounded-2xl px-5 py-8 text-center"
            style={{ background: COLORS.accentSoft, border: `1px solid ${COLORS.border}` }}
          >
            <p className="text-sm" style={{ color: COLORS.muted }}>
              오늘 예정된 드롭이 없습니다
            </p>
          </div>
        )}

        {drop && status && hms && (
          <>
            {(status === "SCHEDULED" || status === "ON_SALE") && (
              <div
                className="mx-4 mb-5 mt-4 rounded-2xl px-5 py-4 text-center"
                style={{ background: COLORS.accentSoft, border: `1px solid ${COLORS.border}` }}
              >
                <p className="text-xs mb-2" style={{ color: COLORS.muted }}>
                  {status === "SCHEDULED" ? "드롭 오픈까지" : "판매 마감까지"}
                </p>
                <div className="flex items-end justify-center gap-1">
                  {[hms.h, hms.m, hms.s].map((v, i) => (
                    <div key={i} className="flex items-end">
                      {i > 0 && (
                        <span
                          className="text-3xl font-bold mb-3 mx-0.5 font-mono"
                          style={{ color: COLORS.muted }}
                        >
                          :
                        </span>
                      )}
                      <div className="flex flex-col items-center">
                        <span
                          className="text-5xl font-bold tabular-nums leading-none font-mono"
                          style={{ color: COLORS.text }}
                        >
                          {pad(v)}
                        </span>
                        <span className="text-[11px] mt-1" style={{ color: COLORS.muted }}>
                          {["시", "분", "초"][i]}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-xs mt-3" style={{ color: COLORS.muted }}>
                  {fmtDateTime(drop.dropStart)} 오픈 · {drop.name}
                </p>
              </div>
            )}

            <div className="px-4 mt-4">
              <Link
                href={`/drops/${todayDropQuery.data}`}
                className="block rounded-xl overflow-hidden"
                style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}` }}
              >
                <div className="relative">
                  <BreadBox
                    label={drop.name}
                    className="w-full h-[200px]"
                    src={drop.imageUrl}
                    dim={status === "SOLD_OUT" || status === "CLOSED"}
                  />
                  <div className="absolute top-2 left-2">
                    <DropBadge status={status} />
                  </div>
                </div>
                <div className="p-3">
                  <p className="text-sm font-semibold" style={{ color: COLORS.text }}>
                    {drop.name}
                  </p>
                  <p className="text-sm" style={{ color: COLORS.text }}>
                    {drop.price.toLocaleString()}원
                  </p>
                  {status === "ON_SALE" && (
                    <p className="text-[11px] mt-1 font-semibold" style={{ color: COLORS.accent }}>
                      {drop.remainQuantity}개 남음
                    </p>
                  )}
                </div>
              </Link>
            </div>
          </>
        )}
        <div className="h-4" />
      </div>
    </div>
  );
}
