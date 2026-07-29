"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BackHeader } from "@/components/back-header";
import { COLORS } from "@/lib/theme";
import * as sellerApi from "@/lib/api/seller";
import * as dropApi from "@/lib/api/drop";
import { useAuth } from "@/lib/auth/auth-context";
import { fmtDateTime } from "@/lib/format";
import { getBankName } from "@/lib/bank";
import { ApiException } from "@/lib/api/types";
import type { ApplicationStatus } from "@/lib/api/seller";
import type { DropApiStatus } from "@/lib/api/drop";

const STATUS_LABEL: Record<ApplicationStatus, string> = {
  PENDING: "승인 대기",
  APPROVED: "승인 완료",
  REJECTED: "반려됨",
};

const DROP_STATUS_LABEL: Record<DropApiStatus, string> = {
  UPCOMING: "시작 전",
  ACTIVE: "진행 중",
  COMPLETED: "종료",
};

const DROP_TABS: { status: DropApiStatus; label: string }[] = [
  { status: "UPCOMING", label: "예정" },
  { status: "ACTIVE", label: "진행중" },
  { status: "COMPLETED", label: "종료" },
];

export default function SellerDashboardPage() {
  const { memberId } = useAuth();
  const queryClient = useQueryClient();
  const [dropTab, setDropTab] = useState<DropApiStatus>("UPCOMING");

  const sellerQuery = useQuery({
    queryKey: ["mySeller"],
    queryFn: sellerApi.getMySeller,
    enabled: memberId !== null,
    retry: false,
  });

  const noApplication =
    sellerQuery.isError &&
    sellerQuery.error instanceof ApiException &&
    sellerQuery.error.code === "C003";
  const seller = sellerQuery.data ?? null;
  const isApproved = seller?.applicationStatus === "APPROVED";

  const myDropsQuery = useQuery({
    queryKey: ["myDrops"],
    queryFn: () => dropApi.getMyDrops(),
    enabled: isApproved,
  });

  const deleteMutation = useMutation({
    mutationFn: (dropId: number) => dropApi.deleteDrop(dropId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["myDrops"] }),
  });

  function handleDelete(dropId: number) {
    if (window.confirm("이 드롭을 삭제하시겠습니까?")) {
      deleteMutation.mutate(dropId);
    }
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-y-auto" style={{ background: COLORS.bg }}>
      <BackHeader title="판매자 대시보드" href="/" />

      <div className="flex-1 px-4 py-4 flex flex-col gap-4">
        {sellerQuery.isPending && (
          <p className="text-sm" style={{ color: COLORS.muted }}>
            불러오는 중...
          </p>
        )}
        {sellerQuery.isError && !noApplication && (
          <p className="text-sm" style={{ color: "#E0554F" }}>
            판매자 정보를 불러오지 못했습니다.
          </p>
        )}

        {noApplication && (
          <div className="flex flex-col items-center justify-center gap-4 py-16">
            <p className="text-sm" style={{ color: COLORS.muted }}>
              아직 판매자 입점 신청 내역이 없습니다.
            </p>
            <Link
              href="/seller/register"
              className="px-5 py-2.5 rounded-lg text-sm font-semibold"
              style={{ background: COLORS.accentSoft, color: COLORS.accent }}
            >
              입점 신청하기
            </Link>
          </div>
        )}

        {seller && (
          <div
            className="rounded-xl p-4 flex flex-col gap-2"
            style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}` }}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold" style={{ color: COLORS.text }}>
                {seller.bakeryName}
              </span>
              <span
                className="text-[11px] font-semibold px-2 py-0.5 rounded"
                style={{
                  background:
                    seller.applicationStatus === "APPROVED"
                      ? COLORS.greenSoft
                      : seller.applicationStatus === "REJECTED"
                        ? "#1a1a1a"
                        : COLORS.accentSoft,
                  color:
                    seller.applicationStatus === "APPROVED"
                      ? COLORS.green
                      : seller.applicationStatus === "REJECTED"
                        ? COLORS.muted
                        : COLORS.accent,
                }}
              >
                {STATUS_LABEL[seller.applicationStatus]}
              </span>
            </div>
            <p className="text-xs" style={{ color: COLORS.muted }}>
              사업자등록번호 {seller.businessNumber}
            </p>
            <p className="text-xs" style={{ color: COLORS.muted }}>
              정산 계좌 {getBankName(seller.settlementBankCode)} {seller.settlementAccountNumberMasked}
              {seller.accountVerified ? " (인증됨)" : " (미인증)"}
            </p>
            {seller.applicationStatus === "REJECTED" && seller.rejectReason && (
              <p
                className="text-xs pt-2"
                style={{ color: "#E0554F", borderTop: `1px solid ${COLORS.border}` }}
              >
                반려 사유: {seller.rejectReason}
              </p>
            )}
          </div>
        )}

        {isApproved && (
          <Link
            href="/seller/settlements"
            className="w-full py-3 rounded-lg text-sm text-center"
            style={{ border: `1px solid ${COLORS.border}`, color: COLORS.text }}
          >
            내 정산
          </Link>
        )}

        {isApproved && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold" style={{ color: COLORS.text }}>
                내 드롭
              </span>
              <Link
                href="/seller/drops/new"
                className="text-xs font-semibold"
                style={{ color: COLORS.accent }}
              >
                + 새 드롭 등록
              </Link>
            </div>

            {myDropsQuery.isLoading && (
              <p className="text-sm" style={{ color: COLORS.muted }}>
                불러오는 중...
              </p>
            )}
            {myDropsQuery.isError && (
              <p className="text-sm" style={{ color: "#E0554F" }}>
                드롭 목록을 불러오지 못했습니다.
              </p>
            )}

            {myDropsQuery.data && (
              <div className="flex gap-2">
                {DROP_TABS.map((tab) => (
                  <button
                    key={tab.status}
                    onClick={() => setDropTab(tab.status)}
                    className="px-3 py-1.5 rounded-full text-sm"
                    style={{
                      background: dropTab === tab.status ? COLORS.accent : COLORS.surface,
                      color: dropTab === tab.status ? COLORS.bg : COLORS.muted,
                      border: dropTab === tab.status ? "none" : `1px solid ${COLORS.border}`,
                      fontWeight: dropTab === tab.status ? 600 : 400,
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            )}

            {myDropsQuery.data?.filter((d) => d.dropStatus === dropTab).length === 0 && (
              <p className="text-sm" style={{ color: COLORS.muted }}>
                {DROP_TABS.find((t) => t.status === dropTab)?.label} 드롭이 없습니다.
              </p>
            )}

            {myDropsQuery.data
              ?.filter((d) => d.dropStatus === dropTab)
              .map((drop) => (
              <div
                key={drop.dropId}
                className="rounded-xl p-4 flex flex-col gap-2"
                style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}` }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold" style={{ color: COLORS.text }}>
                    {drop.name}
                  </span>
                  <span
                    className="text-[11px] font-semibold px-2 py-0.5 rounded"
                    style={{ background: COLORS.accentSoft, color: COLORS.accent }}
                  >
                    {DROP_STATUS_LABEL[drop.dropStatus]}
                  </span>
                </div>
                <p className="text-xs" style={{ color: COLORS.muted }}>
                  {fmtDateTime(drop.dropStart)} ~ {fmtDateTime(drop.dropEnd)}
                </p>
                <p className="text-xs" style={{ color: COLORS.muted }}>
                  {drop.price.toLocaleString()}원 · 재고 {drop.remainQuantity}/{drop.totalQuantity}
                </p>

                {drop.dropStatus === "UPCOMING" && (
                  <div className="flex gap-2 pt-2" style={{ borderTop: `1px solid ${COLORS.border}` }}>
                    <Link
                      href={`/seller/drops/${drop.dropId}/edit`}
                      className="flex-1 py-2 rounded-lg text-sm text-center"
                      style={{ border: `1px solid ${COLORS.border}`, color: COLORS.text }}
                    >
                      수정
                    </Link>
                    <button
                      onClick={() => handleDelete(drop.dropId)}
                      disabled={deleteMutation.isPending}
                      className="flex-1 py-2 rounded-lg text-sm disabled:opacity-60"
                      style={{ border: `1px solid ${COLORS.border}`, color: "#E0554F" }}
                    >
                      삭제
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
