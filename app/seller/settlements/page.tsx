"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { BackHeader } from "@/components/back-header";
import { COLORS } from "@/lib/theme";
import * as settlementApi from "@/lib/api/settlement";
import type { SettlementStatus } from "@/lib/api/settlement";
import { ApiException } from "@/lib/api/types";
import { SettlementStatusBadge } from "@/components/settlement-status-badge";
import { fmtPickup } from "@/lib/format";

type StatusFilter = SettlementStatus | "ALL";

const STATUS_TABS: { key: StatusFilter; label: string }[] = [
  { key: "ALL", label: "전체" },
  { key: "READY", label: "정산 대기" },
  { key: "ON_HOLD", label: "보류" },
  { key: "PAYING", label: "지급 중" },
  { key: "COMPLETED", label: "지급 완료" },
  { key: "FAILED", label: "지급 실패" },
];

export default function MySettlementsPage() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");

  const settlementsQuery = useQuery({
    queryKey: ["mySettlements"],
    queryFn: settlementApi.getMySettlements,
    retry: false,
  });

  const notApprovedSeller =
    settlementsQuery.isError &&
    settlementsQuery.error instanceof ApiException &&
    settlementsQuery.error.code === "C003";

  const allSettlements = settlementsQuery.data?.settlements ?? [];
  const filteredSettlements =
    statusFilter === "ALL" ? allSettlements : allSettlements.filter((s) => s.status === statusFilter);

  const totalCompleted = allSettlements
    .filter((s) => s.status === "COMPLETED")
    .reduce((sum, s) => sum + s.payoutAmount, 0);
  const pendingCount = allSettlements.filter(
    (s) => s.status === "READY" || s.status === "ON_HOLD" || s.status === "PAYING",
  ).length;

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

        {settlementsQuery.data && allSettlements.length > 0 && (
          <div
            className="rounded-xl p-4 flex items-center justify-between"
            style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}` }}
          >
            <div className="flex flex-col gap-0.5">
              <span className="text-xs" style={{ color: COLORS.muted }}>
                지급 완료 누적
              </span>
              <span className="text-lg font-bold" style={{ color: COLORS.accent }}>
                {totalCompleted.toLocaleString()}원
              </span>
            </div>
            <div className="flex flex-col gap-0.5 items-end">
              <span className="text-xs" style={{ color: COLORS.muted }}>
                진행중 정산
              </span>
              <span className="text-lg font-bold" style={{ color: COLORS.text }}>
                {pendingCount}건
              </span>
            </div>
          </div>
        )}

        {settlementsQuery.data && allSettlements.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {STATUS_TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setStatusFilter(tab.key)}
                className="px-3 py-1.5 rounded-full text-sm whitespace-nowrap shrink-0"
                style={{
                  background: statusFilter === tab.key ? COLORS.accent : COLORS.surface,
                  color: statusFilter === tab.key ? COLORS.bg : COLORS.muted,
                  border: statusFilter === tab.key ? "none" : `1px solid ${COLORS.border}`,
                  fontWeight: statusFilter === tab.key ? 600 : 400,
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}

        {settlementsQuery.data && allSettlements.length === 0 && (
          <p className="text-sm" style={{ color: COLORS.muted }}>
            아직 생성된 정산 내역이 없습니다.
          </p>
        )}
        {settlementsQuery.data && allSettlements.length > 0 && filteredSettlements.length === 0 && (
          <p className="text-sm" style={{ color: COLORS.muted }}>
            해당 상태의 정산 내역이 없습니다.
          </p>
        )}

        {filteredSettlements.map((settlement) => (
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
