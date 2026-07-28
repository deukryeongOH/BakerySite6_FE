const SELLER_ID_PREFIX = "openbake:sellerId:";

/**
 * 백엔드에 "내 판매자 신청 조회" API가 없어서, 신청 성공 시 apply 응답의
 * sellerId를 로컬에 저장해두고 이후 GET /sellers/{sellerId}로 상태를
 * 확인한다. (docs/seller-api.md 1-6 참고)
 *
 * memberId별로 키를 분리한다 — 로그인 세션이 아니라 회원 계정에 귀속된
 * 정보라서, 로그아웃 후 같은 계정으로 재로그인해도 유지돼야 한다
 * (반대로 로그아웃하지 않고 다른 계정으로 바뀌면 그 계정의 값만 보여야 함).
 */
export function getSellerId(memberId: number): number | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(SELLER_ID_PREFIX + memberId);
  return raw ? Number(raw) : null;
}

export function setSellerId(memberId: number, sellerId: number): void {
  localStorage.setItem(SELLER_ID_PREFIX + memberId, String(sellerId));
}
