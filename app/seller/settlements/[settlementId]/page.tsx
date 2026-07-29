"use client";

import { Fragment } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { BackHeader } from "@/components/back-header";
import { BreadBox } from "@/components/bread-box";
import { COLORS } from "@/lib/theme";
import * as settlementApi from "@/lib/api/settlement";
import type { SettlementStatus } from "@/lib/api/settlement";
import { ApiException } from "@/lib/api/types";
import { SettlementStatusBadge } from "@/components/settlement-status-badge";
import { fmtDateTime, fmtPickup } from "@/lib/format";

const ERROR_COLOR = "#E0554F";

const TIMELINE_STEPS = [
  { key: "confirmed", label: "정산 확정" },
  { key: "paying", label: "지급 처리" },
  { key: "done", label: "지급 완료" },
] as const;

function SettlementTimeline({ status }: { status: SettlementStatus }) {
  const isFailed = status === "FAILED";
  const stepIndex = status === "COMPLETED" ? 2 : status === "PAYING" || isFailed ? 1 : 0;

  return (
    <div className="flex items-center pt-1">
      {TIMELINE_STEPS.map((step, i) => (
        <Fragment key={step.key}>
          <div className="flex flex-col items-center gap-1">
            <div
              className="w-2.5 h-2.5 rounded-full"
              style={{
                background: isFailed && i === 1 ? ERROR_COLOR : i <= stepIndex ? COLORS.accent : COLORS.border,
              }}
            />
            <span
              className="text-[10px] whitespace-nowrap"
              style={{ color: i <= stepIndex ? COLORS.text : COLORS.muted }}
            >
              {step.label}
            </span>
          </div>
          {i < TIMELINE_STEPS.length - 1 && (
            <div
              className="flex-1 h-px mb-3.5"
              style={{ background: i < stepIndex ? COLORS.accent : COLORS.border }}
            />
          )}
        </Fragment>
      ))}
    </div>
  );
}

const STATUS_MESSAGE: Partial<Record<SettlementStatus, { text: string; color: string }>> = {
  ON_HOLD: { text: "정산이 보류 상태입니다. 자세한 사유는 정산팀에 문의해주세요.", color: COLORS.muted },
  PAYING: { text: "지급이 진행 중입니다. 영업일 기준 1~2일 내 등록된 계좌로 입금됩니다.", color: COLORS.accent },
  FAILED: {
    text: "지급 처리 중 문제가 발생했습니다. 정산팀에서 확인 후 다시 지급을 진행할 예정입니다.",
    color: ERROR_COLOR,
  },
};

export default function MySettlementDetailPage() {
  const params = useParams<{ settlementId: string }>();
  const settlementId = Number(params.settlementId);
  const settlementIdValid = Number.isFinite(settlementId) && settlementId > 0;

  const settlementQuery = useQuery({
    queryKey: ["mySettlement", settlementId],
    queryFn: () => settlementApi.getMySettlementDetail(settlementId),
    enabled: settlementIdValid,
  });

  const settlement = settlementQuery.data;

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-y-auto" style={{ background: COLORS.bg }}>
      <BackHeader title="정산 상세" href="/seller/settlements" />

      <div className="flex-1 px-4 py-4 flex flex-col gap-3">
        {!settlementIdValid && (
          <p className="text-sm" style={{ color: COLORS.muted }}>
            잘못된 접근입니다.
          </p>
        )}
        {settlementIdValid && settlementQuery.isLoading && (
          <p className="text-sm" style={{ color: COLORS.muted }}>
            불러오는 중...
          </p>
        )}
        {settlementIdValid && settlementQuery.isError && (
          <p className="text-sm" style={{ color: "#E0554F" }}>
            {settlementQuery.error instanceof ApiException
              ? settlementQuery.error.message
              : "정산 정보를 불러오지 못했습니다."}
          </p>
        )}

        {settlement && (
          <>
            <div
              className="rounded-xl p-4 flex flex-col gap-2"
              style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}` }}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold" style={{ color: COLORS.text }}>
                  {fmtPickup(settlement.periodStart)} ~ {fmtPickup(settlement.periodEnd)}
                </span>
                <SettlementStatusBadge status={settlement.status} />
              </div>

              <SettlementTimeline status={settlement.status} />

              {STATUS_MESSAGE[settlement.status] && (
                <p className="text-xs pt-1" style={{ color: STATUS_MESSAGE[settlement.status]!.color }}>
                  {STATUS_MESSAGE[settlement.status]!.text}
                </p>
              )}

              <div className="text-center py-3">
                <span className="text-3xl font-bold" style={{ color: COLORS.accent }}>
                  {settlement.payoutAmount.toLocaleString()}원
                </span>
                <p className="text-xs mt-1" style={{ color: COLORS.muted }}>
                  지급 예정/완료 금액
                </p>
              </div>
              {[
                ["판매 금액", `${settlement.grossSalesAmount.toLocaleString()}원`],
                ["수수료", `${settlement.commissionAmount.toLocaleString()}원`],
                ["조정 금액", `${settlement.adjustmentAmount.toLocaleString()}원`],
                ["순 매출", `${settlement.netSalesAmount.toLocaleString()}원`],
                ["정산 건수", `${settlement.targetCount}건`],
              ].map(([l, v]) => (
                <div key={l} className="flex justify-between py-1">
                  <span className="text-sm" style={{ color: COLORS.muted }}>
                    {l}
                  </span>
                  <span className="text-sm" style={{ color: COLORS.text }}>
                    {v}
                  </span>
                </div>
              ))}
              <div className="flex justify-between py-1 pt-2" style={{ borderTop: `1px solid ${COLORS.border}` }}>
                <span className="text-sm" style={{ color: COLORS.muted }}>
                  생성일
                </span>
                <span className="text-sm" style={{ color: COLORS.text }}>
                  {fmtDateTime(settlement.createdAt)}
                </span>
              </div>
              {settlement.completedAt && (
                <div className="flex justify-between py-1">
                  <span className="text-sm" style={{ color: COLORS.muted }}>
                    완료일
                  </span>
                  <span className="text-sm" style={{ color: COLORS.text }}>
                    {fmtDateTime(settlement.completedAt)}
                  </span>
                </div>
              )}
            </div>

            <p className="text-sm font-semibold" style={{ color: COLORS.text }}>
              주문 항목별 내역 ({settlement.lines.length})
            </p>

            {settlement.lines.map((line) => (
              <div
                key={line.settlementLineId}
                className="rounded-xl p-4 flex gap-3"
                style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}` }}
              >
                <BreadBox className="w-14 h-14 rounded-lg flex-shrink-0" label={line.productName} />
                <div className="flex-1 flex flex-col gap-1">
                  <span className="text-sm font-semibold" style={{ color: COLORS.text }}>
                    {line.productName} {line.quantity}개
                  </span>
                  <span className="text-xs" style={{ color: COLORS.muted }}>
                    주문 #{line.orderId} · {fmtDateTime(line.purchaseConfirmedAt)}
                  </span>
                  <div className="flex justify-between pt-1">
                    <span className="text-xs" style={{ color: COLORS.muted }}>
                      판매 {line.grossAmount.toLocaleString()}원 − 수수료{" "}
                      {(line.commissionRate * 100).toFixed(0)}% ({line.commissionAmount.toLocaleString()}원)
                    </span>
                  </div>
                  <span className="text-sm font-semibold" style={{ color: COLORS.accent }}>
                    순정산 {line.netAmount.toLocaleString()}원
                  </span>
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
