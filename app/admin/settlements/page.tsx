"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BackHeader } from "@/components/back-header";
import { COLORS } from "@/lib/theme";
import * as settlementApi from "@/lib/api/settlement";
import { ApiException } from "@/lib/api/types";
import { PayoutStatusBadge, SettlementStatusBadge } from "@/components/settlement-status-badge";

const inputStyle = {
  background: COLORS.surface,
  color: COLORS.text,
  border: `1px solid ${COLORS.border}`,
};

const ERROR_COLOR = "#E0554F";

function errorMessage(error: unknown, fallback: string) {
  return error instanceof ApiException ? error.message : fallback;
}

function formatDate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function defaultPeriod() {
  const now = new Date();
  const periodEnd = new Date(now.getFullYear(), now.getMonth(), 1);
  const periodStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return { periodStart: formatDate(periodStart), periodEnd: formatDate(periodEnd) };
}

type Tab = "batch" | "payout";

export default function AdminSettlementsPage() {
  const [tab, setTab] = useState<Tab>("batch");

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-y-auto" style={{ background: COLORS.bg }}>
      <BackHeader title="정산 관리" href="/" />

      <div className="flex px-4 pt-4 gap-2">
        {(
          [
            { key: "batch", label: "배치 실행" },
            { key: "payout", label: "지급 관리" },
          ] as const
        ).map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setTab(item.key)}
            className="flex-1 py-2 rounded-lg text-sm font-semibold"
            style={
              tab === item.key
                ? { background: COLORS.accent, color: COLORS.bg }
                : { border: `1px solid ${COLORS.border}`, color: COLORS.text }
            }
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="flex-1 px-4 py-4 flex flex-col gap-3">
        {tab === "batch" ? <BatchTab /> : <PayoutTab />}
      </div>
    </div>
  );
}

function BatchTab() {
  const queryClient = useQueryClient();
  const [period, setPeriod] = useState(defaultPeriod);

  const runMutation = useMutation({
    mutationFn: () => settlementApi.runMonthlyBatch(period),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settlements", "batches"] });
    },
  });

  const listQuery = useQuery({
    queryKey: ["settlements", "batches"],
    queryFn: () => settlementApi.getBatchExecutions(0, 20),
    refetchInterval: (query) => {
      const executions = query.state.data?.executions ?? [];
      const hasRunning = executions.some((e) => e.status === "STARTING" || e.status === "STARTED");
      return hasRunning ? 5000 : false;
    },
  });

  return (
    <>
      <div
        className="rounded-xl p-4 flex flex-col gap-3"
        style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}` }}
      >
        <p className="text-sm font-semibold" style={{ color: COLORS.text }}>
          월 정산 배치 실행
        </p>
        <div className="flex gap-2">
          <input
            type="date"
            value={period.periodStart}
            onChange={(e) => setPeriod((p) => ({ ...p, periodStart: e.target.value }))}
            className="flex-1 px-3 py-2 rounded-lg text-sm outline-none"
            style={inputStyle}
          />
          <input
            type="date"
            value={period.periodEnd}
            onChange={(e) => setPeriod((p) => ({ ...p, periodEnd: e.target.value }))}
            className="flex-1 px-3 py-2 rounded-lg text-sm outline-none"
            style={inputStyle}
          />
        </div>
        <p className="text-xs" style={{ color: COLORS.muted }}>
          시작일 포함 ~ 종료일 미포함 구간의 정산 대상을 집계합니다.
        </p>
        {runMutation.isError && (
          <p className="text-xs" style={{ color: ERROR_COLOR }}>
            {errorMessage(runMutation.error, "배치 실행에 실패했습니다.")}
          </p>
        )}
        {runMutation.isSuccess && (
          <p className="text-xs" style={{ color: COLORS.green }}>
            실행됨 — jobExecutionId {runMutation.data.jobExecutionId} ({runMutation.data.status})
          </p>
        )}
        <button
          type="button"
          onClick={() => runMutation.mutate()}
          disabled={runMutation.isPending}
          className="py-2.5 rounded-lg text-sm font-semibold disabled:opacity-60"
          style={{ background: COLORS.accent, color: COLORS.bg }}
        >
          {runMutation.isPending ? "실행 중..." : "정산 배치 실행"}
        </button>
      </div>

      <p className="text-xs" style={{ color: COLORS.muted }}>
        배치 실행 이력
      </p>

      {listQuery.isLoading && (
        <p className="text-sm" style={{ color: COLORS.muted }}>
          불러오는 중...
        </p>
      )}
      {listQuery.isError && (
        <p className="text-sm" style={{ color: ERROR_COLOR }}>
          {errorMessage(listQuery.error, "이력을 불러오지 못했습니다.")}
        </p>
      )}
      {listQuery.data && listQuery.data.executions.length === 0 && (
        <p className="text-sm" style={{ color: COLORS.muted }}>
          실행 이력이 없습니다.
        </p>
      )}

      {listQuery.data?.executions.map((execution) => (
        <div
          key={execution.jobExecutionId}
          className="rounded-xl p-4 flex flex-col gap-1"
          style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}` }}
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold" style={{ color: COLORS.text }}>
              {execution.periodStart} ~ {execution.periodEnd}
            </span>
            <SettlementStatusBadge status={execution.status} />
          </div>
          <span className="text-xs" style={{ color: COLORS.muted }}>
            jobExecutionId {execution.jobExecutionId}
          </span>
          <span className="text-xs" style={{ color: COLORS.muted }}>
            {execution.startTime ?? "-"} ~ {execution.endTime ?? "-"}
          </span>
          {execution.exitCode && (
            <span className="text-xs" style={{ color: COLORS.muted }}>
              exitCode: {execution.exitCode}
            </span>
          )}
          {execution.status === "FAILED" && execution.exitDescription && (
            <span className="text-xs" style={{ color: ERROR_COLOR }}>
              {execution.exitDescription}
            </span>
          )}
        </div>
      ))}
    </>
  );
}

function PayoutTab() {
  const queryClient = useQueryClient();
  const [settlementIdInput, setSettlementIdInput] = useState("");
  const [settlementId, setSettlementId] = useState<number | null>(null);
  const [externalTxId, setExternalTxId] = useState<Record<number, string>>({});
  const [failureReason, setFailureReason] = useState<Record<number, string>>({});

  const payoutsQuery = useQuery({
    queryKey: ["settlements", settlementId, "payouts"],
    queryFn: () => settlementApi.getPayoutsForSettlement(settlementId!),
    enabled: settlementId !== null,
  });

  const invalidatePayouts = () =>
    queryClient.invalidateQueries({ queryKey: ["settlements", settlementId, "payouts"] });

  const startMutation = useMutation({
    mutationFn: () => settlementApi.startPayout(settlementId!, `PAYOUT-${settlementId}-${Date.now()}`),
    onSuccess: invalidatePayouts,
  });

  const completeMutation = useMutation({
    mutationFn: (payoutId: number) => settlementApi.completePayout(payoutId, externalTxId[payoutId] ?? ""),
    onSuccess: invalidatePayouts,
  });

  const failMutation = useMutation({
    mutationFn: (payoutId: number) => settlementApi.failPayout(payoutId, failureReason[payoutId] ?? ""),
    onSuccess: invalidatePayouts,
  });

  return (
    <>
      <div
        className="rounded-xl p-3"
        style={{ background: COLORS.accentSoft, border: `1px solid ${COLORS.border}` }}
      >
        <p className="text-xs" style={{ color: COLORS.accent }}>
          관리자용 정산 목록 조회 API가 아직 없어 정산 ID를 직접 입력해야 합니다.
        </p>
      </div>

      <div className="flex gap-2">
        <input
          placeholder="정산 ID"
          value={settlementIdInput}
          onChange={(e) => setSettlementIdInput(e.target.value)}
          inputMode="numeric"
          className="flex-1 px-4 py-2.5 rounded-lg text-sm outline-none"
          style={inputStyle}
        />
        <button
          type="button"
          onClick={() => {
            const id = Number(settlementIdInput);
            if (Number.isFinite(id) && id > 0) setSettlementId(id);
          }}
          className="px-4 py-2.5 rounded-lg text-sm font-semibold"
          style={{ background: COLORS.accent, color: COLORS.bg }}
        >
          조회
        </button>
      </div>

      {settlementId !== null && (
        <>
          {payoutsQuery.isLoading && (
            <p className="text-sm" style={{ color: COLORS.muted }}>
              불러오는 중...
            </p>
          )}
          {payoutsQuery.isError && (
            <p className="text-sm" style={{ color: ERROR_COLOR }}>
              {errorMessage(payoutsQuery.error, "지급 이력을 불러오지 못했습니다.")}
            </p>
          )}

          {startMutation.isError && (
            <p className="text-xs" style={{ color: ERROR_COLOR }}>
              {errorMessage(startMutation.error, "지급 시작에 실패했습니다.")}
            </p>
          )}
          <button
            type="button"
            onClick={() => startMutation.mutate()}
            disabled={startMutation.isPending}
            className="py-2.5 rounded-lg text-sm font-semibold disabled:opacity-60"
            style={{ background: COLORS.accent, color: COLORS.bg }}
          >
            {startMutation.isPending ? "시작 중..." : `정산 #${settlementId} 지급 시작`}
          </button>

          {payoutsQuery.data && payoutsQuery.data.payouts.length === 0 && (
            <p className="text-sm" style={{ color: COLORS.muted }}>
              지급 이력이 없습니다.
            </p>
          )}

          {payoutsQuery.data?.payouts.map((payout) => (
            <div
              key={payout.payoutId}
              className="rounded-xl p-4 flex flex-col gap-2"
              style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}` }}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold" style={{ color: COLORS.text }}>
                  payoutId {payout.payoutId}
                </span>
                <PayoutStatusBadge status={payout.status} />
              </div>
              <span className="text-xs" style={{ color: COLORS.muted }}>
                {payout.payoutAmount.toLocaleString()}원 · sellerId {payout.sellerId}
              </span>
              <span className="text-xs" style={{ color: COLORS.muted }}>
                요청 {payout.requestedAt}
                {payout.completedAt && ` · 완료 ${payout.completedAt}`}
                {payout.failedAt && ` · 실패 ${payout.failedAt}`}
              </span>
              {payout.externalTransactionId && (
                <span className="text-xs" style={{ color: COLORS.muted }}>
                  externalTransactionId: {payout.externalTransactionId}
                </span>
              )}
              {payout.failureReason && (
                <span className="text-xs" style={{ color: ERROR_COLOR }}>
                  {payout.failureReason}
                </span>
              )}

              {payout.status === "PROCESSING" && (
                <div className="flex flex-col gap-2 pt-2" style={{ borderTop: `1px solid ${COLORS.border}` }}>
                  <div className="flex gap-2">
                    <input
                      placeholder="externalTransactionId"
                      value={externalTxId[payout.payoutId] ?? ""}
                      onChange={(e) =>
                        setExternalTxId((prev) => ({ ...prev, [payout.payoutId]: e.target.value }))
                      }
                      className="flex-1 px-3 py-2 rounded-lg text-sm outline-none"
                      style={inputStyle}
                    />
                    <button
                      type="button"
                      onClick={() => completeMutation.mutate(payout.payoutId)}
                      disabled={completeMutation.isPending && completeMutation.variables === payout.payoutId}
                      className="px-3 py-2 rounded-lg text-sm font-semibold disabled:opacity-60 shrink-0"
                      style={{ background: COLORS.green, color: COLORS.bg }}
                    >
                      완료 처리
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <input
                      placeholder="실패 사유"
                      value={failureReason[payout.payoutId] ?? ""}
                      onChange={(e) =>
                        setFailureReason((prev) => ({ ...prev, [payout.payoutId]: e.target.value }))
                      }
                      className="flex-1 px-3 py-2 rounded-lg text-sm outline-none"
                      style={inputStyle}
                    />
                    <button
                      type="button"
                      onClick={() => failMutation.mutate(payout.payoutId)}
                      disabled={failMutation.isPending && failMutation.variables === payout.payoutId}
                      className="px-3 py-2 rounded-lg text-sm disabled:opacity-60 shrink-0"
                      style={{ border: `1px solid ${COLORS.border}`, color: COLORS.text }}
                    >
                      실패 처리
                    </button>
                  </div>
                  {completeMutation.isError && completeMutation.variables === payout.payoutId && (
                    <p className="text-xs" style={{ color: ERROR_COLOR }}>
                      {errorMessage(completeMutation.error, "완료 처리에 실패했습니다.")}
                    </p>
                  )}
                  {failMutation.isError && failMutation.variables === payout.payoutId && (
                    <p className="text-xs" style={{ color: ERROR_COLOR }}>
                      {errorMessage(failMutation.error, "실패 처리에 실패했습니다.")}
                    </p>
                  )}
                </div>
              )}
            </div>
          ))}
        </>
      )}
    </>
  );
}
