import { apiRequest } from "@/lib/api/client";
import type { OrderState } from "@/lib/api/order";

export interface SellerOrderListItem {
  orderId: number;
  dropId: number;
  dropName: string;
  buyerName: string;
  quantity: number;
  totalAmount: number;
  orderState: OrderState;
  pickupDate: string;
  paidAt: string;
  confirmedAt: string | null;
  canceledAt: string | null;
}

export interface SellerOrderListResponse {
  content: SellerOrderListItem[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface GetSellerOrdersParams {
  orderState?: OrderState;
  page?: number;
  size?: number;
}

/** 판매자 본인 판매내역 목록 조회(최신순). 판매자로 등록되지 않은 계정은 403. */
export function getSellerOrders(params: GetSellerOrdersParams = {}) {
  const query = new URLSearchParams();
  if (params.orderState) query.set("orderState", params.orderState);
  if (params.page !== undefined) query.set("page", String(params.page));
  if (params.size !== undefined) query.set("size", String(params.size));
  const qs = query.toString();
  return apiRequest<SellerOrderListResponse>(`/api/v1/sellers/me/orders${qs ? `?${qs}` : ""}`);
}
