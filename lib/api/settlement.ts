import { apiRequest } from "@/lib/api/client";

export type SettlementStatus = "READY" | "ON_HOLD" | "PAYING" | "FAILED" | "COMPLETED";

export type SettlementPayoutStatus = "REQUESTED" | "PROCESSING" | "COMPLETED" | "FAILED";

/** Spring Batch BatchStatus 값. 실사용 값 위주로 좁혀두되, 미처 못 다룬 값도 문자열로 허용. */
export type BatchExecutionStatus =
  | "STARTING"
  | "STARTED"
  | "STOPPING"
  | "STOPPED"
  | "COMPLETED"
  | "FAILED"
  | "ABANDONED"
  | "UNKNOWN"
  | (string & {});

export interface RunMonthlyBatchRequest {
  periodStart: string;
  periodEnd: string;
}

export interface MonthlySettlementBatchResponse {
  jobExecutionId: number;
  jobName: string;
  status: BatchExecutionStatus;
}

/** 월 정산 배치(Spring Batch) 실행. periodStart~periodEnd 구간의 PENDING 정산 대상을 집계한다. */
export function runMonthlyBatch(req: RunMonthlyBatchRequest) {
  return apiRequest<MonthlySettlementBatchResponse>("/internal/v1/settlement-batches/monthly", {
    method: "POST",
    body: req,
  });
}

export interface BatchExecution {
  jobExecutionId: number;
  jobInstanceId: number;
  jobName: string;
  status: BatchExecutionStatus;
  startTime: string | null;
  endTime: string | null;
  exitCode: string | null;
  exitDescription: string | null;
  periodStart: string;
  periodEnd: string;
}

export function getBatchExecution(jobExecutionId: number) {
  return apiRequest<BatchExecution>(`/internal/v1/settlement-batches/${jobExecutionId}`);
}

export interface BatchExecutionListResponse {
  executions: BatchExecution[];
  page: number;
  size: number;
  hasNext: boolean;
}

export function getBatchExecutions(page = 0, size = 20) {
  return apiRequest<BatchExecutionListResponse>(
    `/internal/v1/settlement-batches?page=${page}&size=${size}`,
  );
}

export interface SettlementPayout {
  payoutId: number;
  settlementId: number;
  sellerId: number;
  payoutAmount: number;
  idempotencyKey: string;
  status: SettlementPayoutStatus;
  externalTransactionId: string | null;
  failureReason: string | null;
  requestedAt: string;
  completedAt: string | null;
  failedAt: string | null;
}

/** 정산 지급 시작. Settlement가 READY/FAILED 상태일 때만 가능(그 외엔 409 C002). */
export function startPayout(settlementId: number, idempotencyKey: string) {
  return apiRequest<SettlementPayout>(`/internal/v1/settlements/${settlementId}/payouts`, {
    method: "POST",
    body: { idempotencyKey },
  });
}

/** 지급 완료 처리. PROCESSING 상태가 아니면 409 C002. */
export function completePayout(payoutId: number, externalTransactionId: string) {
  return apiRequest<SettlementPayout>(`/internal/v1/settlement-payouts/${payoutId}/complete`, {
    method: "POST",
    body: { externalTransactionId },
  });
}

/** 지급 실패 처리. PROCESSING 상태가 아니면 409 C002. */
export function failPayout(payoutId: number, failureReason: string) {
  return apiRequest<SettlementPayout>(`/internal/v1/settlement-payouts/${payoutId}/fail`, {
    method: "POST",
    body: { failureReason },
  });
}

export interface SettlementPayoutListResponse {
  payouts: SettlementPayout[];
}

export function getPayoutsForSettlement(settlementId: number) {
  return apiRequest<SettlementPayoutListResponse>(
    `/internal/v1/settlements/${settlementId}/payouts`,
  );
}

export interface Settlement {
  settlementId: number;
  sellerId: number;
  periodStart: string;
  periodEnd: string;
  grossSalesAmount: number;
  commissionAmount: number;
  netSalesAmount: number;
  adjustmentAmount: number;
  payoutAmount: number;
  targetCount: number;
  status: SettlementStatus;
  createdAt: string;
  completedAt: string | null;
}

/** 관리자용 정산 단건 상세 조회. 지급 시작 전 판매자/금액을 확인하는 용도. */
export function getSettlement(settlementId: number) {
  return apiRequest<Settlement>(`/internal/v1/settlements/${settlementId}`);
}

// ── 판매자 본인용 (로그인 토큰 기준, sellerId 불필요) ──────────────────────

export interface SellerSettlementSummary {
  settlementId: number;
  periodStart: string;
  periodEnd: string;
  grossSalesAmount: number;
  commissionAmount: number;
  adjustmentAmount: number;
  payoutAmount: number;
  targetCount: number;
  status: SettlementStatus;
  createdAt: string;
  completedAt: string | null;
}

/** 로그인한 판매자 본인의 월별 정산 목록. 승인된 판매자가 아니면 404 C003. */
export function getMySettlements() {
  return apiRequest<{ settlements: SellerSettlementSummary[] }>("/api/v1/sellers/me/settlements");
}

export interface SellerSettlementLine {
  settlementLineId: number;
  targetId: number;
  orderId: number;
  orderItemId: number;
  dropId: number;
  productName: string;
  quantity: number;
  grossAmount: number;
  commissionRate: number;
  commissionAmount: number;
  netAmount: number;
  purchaseConfirmedAt: string;
}

export interface SellerSettlementDetail extends SellerSettlementSummary {
  sellerId: number;
  netSalesAmount: number;
  lines: SellerSettlementLine[];
}

/** 정산 상세(주문 항목별 lines 포함). 다른 판매자의 정산 ID도 404 C003으로 처리됨. */
export function getMySettlementDetail(settlementId: number) {
  return apiRequest<SellerSettlementDetail>(`/api/v1/sellers/me/settlements/${settlementId}`);
}
