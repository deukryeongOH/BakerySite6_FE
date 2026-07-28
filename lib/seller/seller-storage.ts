const SELLER_ID_KEY = "openbake:sellerId";

/**
 * 백엔드에 "내 판매자 신청 조회" API가 없어서, 신청 성공 시 apply 응답의
 * sellerId를 로컬에 저장해두고 이후 GET /sellers/{sellerId}로 상태를
 * 확인한다. (docs/seller-api.md 1-6 참고)
 */
export function getSellerId(): number | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(SELLER_ID_KEY);
  return raw ? Number(raw) : null;
}

export function setSellerId(sellerId: number): void {
  localStorage.setItem(SELLER_ID_KEY, String(sellerId));
}

export function clearSellerId(): void {
  localStorage.removeItem(SELLER_ID_KEY);
}
