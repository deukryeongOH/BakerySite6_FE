import { apiRequest } from "@/lib/api/client";

export interface DepositAccount {
  memberId: number;
  balance: number;
  hasChargeInProgress: boolean;
}

export function getDepositAccount() {
  return apiRequest<DepositAccount>("/api/v1/deposit/account");
}

export type TransactionType = "CHARGE" | "PAYMENT" | "REFUND";

export interface Transaction {
  id: number;
  transactionType: TransactionType;
  amount: number;
  balanceAfter: number;
  description: string;
  referenceType: string;
  referenceId: number;
  createdAt: string;
}

/** Spring Data `Page` 원본이 그대로 내려옴 — `page`가 아니라 `number` 필드. */
export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
  first: boolean;
  last: boolean;
  numberOfElements: number;
  empty: boolean;
}

export interface GetTransactionsParams {
  transactionType?: TransactionType;
  page?: number;
  size?: number;
}

export function getDepositTransactions(params: GetTransactionsParams = {}) {
  const query = new URLSearchParams();
  if (params.transactionType) query.set("transactionType", params.transactionType);
  if (params.page !== undefined) query.set("page", String(params.page));
  if (params.size !== undefined) query.set("size", String(params.size));
  const qs = query.toString();
  return apiRequest<PageResponse<Transaction>>(
    `/api/v1/deposit/transactions${qs ? `?${qs}` : ""}`,
  );
}

export interface CreateChargeResponse {
  chargeRequestId: number;
  pgOrderId: string;
  amount: number;
  orderName: string;
  expiresAt: string;
}

export function createCharge(amount: number) {
  return apiRequest<CreateChargeResponse>("/api/v1/deposit/charges", {
    method: "POST",
    body: { amount },
  });
}

export interface ConfirmChargeRequest {
  paymentKey: string;
  orderId: string;
  amount: number;
}

export interface ConfirmChargeResponse {
  chargeRequestId: number;
  status: "DONE";
  chargedAmount: number;
  balanceAfter: number;
  method: string;
  approvedAt: string;
}

export function confirmCharge(req: ConfirmChargeRequest) {
  return apiRequest<ConfirmChargeResponse>("/api/v1/deposit/charges/confirm", {
    method: "POST",
    body: req,
  });
}

export type ChargeStatus = "READY" | "IN_PROGRESS" | "DONE" | "FAILED" | "EXPIRED";

export interface ChargeStatusResponse {
  chargeRequestId: number;
  amount: number;
  status: ChargeStatus;
  method: string | null;
  failureCode: string | null;
  failureReason: string | null;
  requestedAt: string;
  approvedAt: string | null;
  expiresAt: string;
}

export function getChargeStatus(chargeRequestId: number) {
  return apiRequest<ChargeStatusResponse>(`/api/v1/deposit/charges/${chargeRequestId}`);
}
