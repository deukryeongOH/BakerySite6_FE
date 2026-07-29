import { apiRequest } from "@/lib/api/client";
import { getTokens } from "@/lib/auth/token-storage";

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

/**
 * 탭 종료/하드 새로고침처럼 페이지 언로드 중에 쏘는 장바구니 삭제 요청(= 재고 선점 해제).
 * apiRequest는 401 재시도·JSON 파싱 등을 하는데, 언로드 시점엔 응답을 기다릴 수 없으므로
 * fetch를 keepalive로 직접 호출하는 fire-and-forget 방식으로 별도 구현한다.
 * (SPA 내 이동으로 컴포넌트가 언마운트되는 경우는 이 함수 대신 deleteCart()를 그대로 쓰면 됨 —
 * 그때는 페이지가 살아있어서 응답을 기다려도 문제없음.)
 */
export function deleteCartBeacon() {
  const stored = getTokens();
  if (!stored) return;
  const base = process.env.NEXT_PUBLIC_API_BASE_URL;
  fetch(`${base}/api/v1/cart`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${stored.accessToken}` },
    keepalive: true,
  }).catch(() => {});
}
