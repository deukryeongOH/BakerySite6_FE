import { apiRequest } from "@/lib/api/client";

export type OrderState = "PAID" | "CONFIRMED" | "CANCELED";

export interface CreateOrderResponse {
  orderId: number;
  orderState: OrderState;
  totalAmount: number;
  balanceAfter: number;
  paidAt: string;
}

/** 장바구니에 선점된 드롭을 예치금으로 결제. 성공 시 장바구니는 삭제됨(재고는 확정). */
export function createOrder() {
  return apiRequest<CreateOrderResponse>("/api/v1/orders", {
    method: "POST",
    body: { termsAgreed: true },
  });
}

export interface OrderListItem {
  orderId: number;
  dropName: string;
  sellerName: string;
  quantity: number;
  totalAmount: number;
  orderState: OrderState;
  pickupDate: string;
  paidAt: string;
}

export interface OrderListResponse {
  content: OrderListItem[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface GetOrdersParams {
  orderState?: OrderState;
  page?: number;
  size?: number;
}

export function getOrders(params: GetOrdersParams = {}) {
  const query = new URLSearchParams();
  if (params.orderState) query.set("orderState", params.orderState);
  if (params.page !== undefined) query.set("page", String(params.page));
  if (params.size !== undefined) query.set("size", String(params.size));
  const qs = query.toString();
  return apiRequest<OrderListResponse>(`/api/v1/orders${qs ? `?${qs}` : ""}`);
}

export interface OrderDetail {
  orderId: number;
  orderState: OrderState;
  totalAmount: number;
  orderItem: { dropId: number; dropName: string; price: number; quantity: number };
  seller: { sellerId: number; sellerName: string | null };
  pickupDate: string;
  paidAt: string;
  confirmedAt: string | null;
  canceledAt: string | null;
}

export function getOrder(orderId: number) {
  return apiRequest<OrderDetail>(`/api/v1/orders/${orderId}`);
}

export interface CancelOrderResponse {
  orderId: number;
  orderState: OrderState;
  refundAmount: number;
  balanceAfter: number;
  canceledAt: string;
}

/** PAID 상태일 때만 가능. 드롭 마감 이후 취소 방어는 서버에 없음(문서 참고). */
export function cancelOrder(orderId: number) {
  return apiRequest<CancelOrderResponse>(`/api/v1/orders/${orderId}/cancel`, {
    method: "PATCH",
  });
}
