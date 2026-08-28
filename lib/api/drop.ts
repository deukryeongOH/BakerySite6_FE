import { apiRequest } from "@/lib/api/client";

export type DropApiStatus = "UPCOMING" | "ACTIVE" | "COMPLETED";

/**
 * 백엔드 product 도메인의 Category enum. 드롭도 내부적으로는 Product로 저장되고
 * `Product.validateProductInfo`가 null을 거부하므로 등록/수정 요청에 반드시 담아야 한다.
 */
export type DropCategory =
  | "MEAL_BREADS"
  | "SWEET_BREADS"
  | "CAKES_TARTS"
  | "JAM_SPREAD"
  | "COOKIES_BAKES";

export const DROP_CATEGORY_LABELS: Record<DropCategory, string> = {
  MEAL_BREADS: "식사빵",
  SWEET_BREADS: "간식빵",
  CAKES_TARTS: "케이크/타르트",
  JAM_SPREAD: "잼/스프레드",
  COOKIES_BAKES: "쿠키/구움과자",
};

/**
 * `/info`, `/mine`, `/upcoming`, `POST /register`, `PATCH /{dropId}`가 전부 공유하는 응답 DTO.
 *
 * 백엔드 `63ab437`(2026-08-13, "Divide Product Domain From Drop")에서 DropProductInfoResponse가
 * 없어지고 DropInfoResponse 하나로 합쳐지면서 **`pickUpAvailableDates`가 `pickupDates`로 바뀌었다**
 * (요청 DTO는 여전히 `pickUpAvailableDates`라 이름이 서로 어긋나니 주의).
 */
export interface DropInfoResponse {
  dropId: number;
  name: string;
  description: string;
  imageUrl: string;
  dropStart: string;
  dropEnd: string;
  limitQuantity: number;
  price: number;
  totalQuantity: number;
  remainQuantity: number;
  dropStatus: DropApiStatus;
  pickupDates: string[];
  category: DropCategory;
}

/**
 * 문서(docs/drop-api.md)상으로는 인증 불필요한 공개 조회 API지만, 실제 로컬 백엔드는
 * 토큰 없이 호출 시 403을 반환한다(2026-07-28 확인) — 문서와 실제 동작이 어긋나는 지점.
 * 이 앱은 (shop) 레이아웃 가드로 어차피 로그인 사용자만 접근하므로, apiRequest로
 * 있는 토큰을 그대로 실어 보낸다.
 *
 * 문서는 이 응답이 ApiResponse 래퍼 없이 최상위로 온다고 적혀 있지만, 실제로는
 * 다른 API와 동일하게 {success,data} 래퍼가 있다(2026-07-28 브라우저 검증으로 확인 —
 * unwrapped:true로 파싱했더니 모든 필드가 undefined가 돼 드롭 카드가 조용히 안 그려지는
 * 버그가 났었음). 그래서 여기선 unwrapped 옵션을 쓰지 않는다.
 */
export function getDropInfo(dropId: number) {
  return apiRequest<DropInfoResponse>(`/api/v1/drops/${dropId}/info`);
}

/**
 * 오늘부터 days일 동안(기본 7일) UPCOMING/ACTIVE 상태인 드롭을 dropStart 오름차순으로 조회.
 * 인증 필요(403).
 */
export function getUpcomingDrops(days?: number) {
  return apiRequest<DropInfoResponse[]>(
    `/api/v1/drops/upcoming${days !== undefined ? `?days=${days}` : ""}`,
  );
}

export interface QueueEnterResponse {
  rank: number;
  status: "WAITING" | "ACTIVE";
}

export function enterQueue(dropId: number) {
  return apiRequest<QueueEnterResponse>(`/api/v1/drops/${dropId}/enter`, {
    method: "POST",
    body: {},
  });
}

export interface QueueRankResponse {
  rank: number;
  status: "WAITING" | "ACTIVE" | "NOT_FOUND";
}

export function getQueueRank(dropId: number) {
  return apiRequest<QueueRankResponse>(`/api/v1/drops/${dropId}/queue/rank`);
}

export function confirmEntry(dropId: number) {
  return apiRequest<unknown>(`/api/v1/drops/${dropId}/confirm-entry`, {
    method: "POST",
    body: {},
  });
}

/** 수량 선택 후 재고 선점(락). confirm-entry로 생긴 참여 기록이 있어야 성공(DR011). */
export function lockStart(dropId: number, quantity: number) {
  return apiRequest<string>(`/api/v1/drops/${dropId}/lock-start`, {
    method: "POST",
    body: { quantity },
  });
}

/**
 * POST /register와 PATCH /{dropId}가 공유하는 바디 DTO(백엔드 DropInfoRequest).
 *
 * ⚠️ `dropEnd`는 보내지 않는다 — DropController가 `dropStart.plusMinutes(60)`으로 직접
 * 계산하므로 드롭 길이는 항상 1시간 고정이고, 바디에 넣어도 무시된다.
 * ⚠️ 픽업일 필드명이 응답(`pickupDates`)과 달리 요청에선 `pickUpAvailableDates`다.
 */
export interface DropInfoRequest {
  name: string;
  description: string;
  imageUrl: string;
  pickUpAvailableDates: string[];
  dropStart: string;
  limitQuantity: number;
  price: number;
  totalQuantity: number;
  category: DropCategory;
}

export function registerDrop(body: DropInfoRequest) {
  return apiRequest<DropInfoResponse>("/api/v1/drops/register", {
    method: "POST",
    body,
  });
}

/** 로그인한 판매자 본인이 등록한 드롭 전체 조회. 승인된 판매자가 아니면 400 C002. */
export function getMyDrops() {
  return apiRequest<DropInfoResponse[]>("/api/v1/drops/mine");
}

/**
 * UPCOMING 상태인 드롭만 수정 가능(그 외엔 409 DR017). ⚠️ totalQuantity를 보내면
 * 백엔드가 남은 재고를 이 값으로 리셋한다(DropInventory.resetQuantity) — 이미 판매된
 * 수량과 무관하게 재고가 통째로 바뀌므로, 호출하는 UI에서 반드시 경고를 보여줘야 한다.
 */
export function updateDrop(dropId: number, body: DropInfoRequest) {
  return apiRequest<DropInfoResponse>(`/api/v1/drops/${dropId}`, {
    method: "PATCH",
    body,
  });
}

/** UPCOMING 상태인 드롭만 삭제 가능(그 외엔 409 DR017). 204 No Content. */
export function deleteDrop(dropId: number) {
  return apiRequest<void>(`/api/v1/drops/${dropId}`, { method: "DELETE" });
}
