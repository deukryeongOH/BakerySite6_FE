import { apiRequest } from "@/lib/api/client";

export interface CreateCartRequest {
  dropId: number;
  quantity: number;
}

export interface CreateCartResponse {
  cartId: number;
  dropId: number;
  quantity: number;
  expiresAt: string;
  createdAt: string;
}

/** lock-start로 재고를 먼저 선점한 뒤 호출해야 함 — 안 그러면 CA006. */
export function createCart(req: CreateCartRequest) {
  return apiRequest<CreateCartResponse>("/api/v1/cart", {
    method: "POST",
    body: req,
  });
}

export interface Cart {
  cartId: number;
  drop: { dropId: number; dropName: string; price: number; imageUrl?: string };
  seller: { sellerId: number; sellerName: string | null };
  quantity: number;
  estimatedAmount: number;
  pickupDates: string[];
  selectedPickupDate: string | null;
  expiresAt: string;
  remainingSeconds: number;
}

export function getCart() {
  return apiRequest<Cart>("/api/v1/cart");
}

export interface SelectPickupDateResponse {
  cartId: number;
  pickupDate: string;
}

export function selectPickupDate(pickupDate: string) {
  return apiRequest<SelectPickupDateResponse>("/api/v1/cart/pickup-date", {
    method: "PATCH",
    body: { pickupDate },
  });
}

/** 성공 시 204 No Content — 재고도 함께 복구됨. */
export function deleteCart() {
  return apiRequest<void>("/api/v1/cart", { method: "DELETE" });
}
