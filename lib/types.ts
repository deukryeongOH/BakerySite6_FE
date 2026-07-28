import type { DropApiStatus } from "@/lib/api/drop";
import type { OrderState } from "@/lib/api/order";

export type DropStatus = "SCHEDULED" | "ON_SALE" | "SOLD_OUT" | "CLOSED";
export type OrderStatus = "픽업대기" | "구매확정" | "취소";

/** 백엔드 dropStatus(UPCOMING/ACTIVE/COMPLETED)를 화면 표시용 상태로 변환. */
export function toDropStatus(apiStatus: DropApiStatus, remainQuantity: number): DropStatus {
  if (apiStatus === "UPCOMING") return "SCHEDULED";
  if (apiStatus === "COMPLETED") return "CLOSED";
  return remainQuantity > 0 ? "ON_SALE" : "SOLD_OUT";
}

export const ORDER_STATUS_LABEL: Record<OrderState, OrderStatus> = {
  PAID: "픽업대기",
  CONFIRMED: "구매확정",
  CANCELED: "취소",
};
