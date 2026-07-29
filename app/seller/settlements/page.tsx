"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { BackHeader } from "@/components/back-header";
import { COLORS } from "@/lib/theme";
import * as settlementApi from "@/lib/api/settlement";
import { ApiException } from "@/lib/api/types";
import { SettlementStatusBadge } from "@/components/settlement-status-badge";
import { fmtPickup } from "@/lib/format";

export default function MySettlementsPage() {
  const settlementsQuery = useQuery({
    queryKey: ["mySettlements"],
    queryFn: settlementApi.getMySettlements,
    retry: false,
  });

  const notApprovedSeller =
    settlementsQuery.isError &&
    settlementsQuery.error instanceof ApiException &&
    settlementsQuery.error.code === "C003";

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-y-auto" style={{ background: COLORS.bg }}>
      <BackHeader title="내 정산" href="/seller/dashboard" />

      <div className="flex-1 px-4 py-4 flex flex-col gap-3">
        {settlementsQuery.isLoading && (
          <p className="text-sm" style={{ color: COLORS.muted }}>
            불러오는 중...
          </p>
        )}
        {notApprovedSeller && (
          <p className="text-sm" style={{ color: COLORS.muted }}>
            승인된 판매자만 정산 내역을 확인할 수 있습니다.
          </p>
        )}
        {settlementsQuery.isError && !notApprovedSeller && (
          <p className="text-sm" style={{ color: "#E0554F" }}>
            {settlementsQuery.error instanceof ApiException
              ? settlementsQuery.error.message
              : "정산 목록을 불러오지 못했습니다."}
          </p>
        )}
        {settlementsQuery.data && settlementsQuery.data.settlements.length === 0 && (
          <p className="text-sm" style={{ color: COLORS.muted }}>
            아직 생성된 정산 내역이 없습니다.
          </p>
        )}

        {settlementsQuery.data?.settlements.map((settlement) => (
          <Link
            key={settlement.settlementId}
            href={`/seller/settlements/${settlement.settlementId}`}
            className="rounded-xl p-4 flex flex-col gap-2"
            style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}` }}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold" style={{ color: COLORS.text }}>
                {fmtPickup(settlement.periodStart)} ~ {fmtPickup(settlement.periodEnd)}
              </span>
              <SettlementStatusBadge status={settlement.status} />
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-xs" style={{ color: COLORS.muted }}>
                판매 {settlement.grossSalesAmount.toLocaleString()}원 · 수수료{" "}
                {settlement.commissionAmount.toLocaleString()}원 · {settlement.targetCount}건
              </span>
            </div>
            <span className="text-lg font-bold" style={{ color: COLORS.accent }}>
              지급액 {settlement.payoutAmount.toLocaleString()}원
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
