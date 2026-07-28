import { apiRequest } from "@/lib/api/client";

export type DropApiStatus = "UPCOMING" | "ACTIVE" | "COMPLETED";

export interface DropInfo {
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
  return apiRequest<DropInfo>(`/api/v1/drops/${dropId}/info`);
}

/** 오늘 진행하는 드롭의 ID. 오늘 드롭이 없으면 C003 404. (역시 실제로는 인증 필요) */
export function getTodayDropId() {
  return apiRequest<number>("/api/v1/drops/today/drop");
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
