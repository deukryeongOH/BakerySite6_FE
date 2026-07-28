const WISHLIST_PREFIX = "openbake:wishlist:";

/** useSyncExternalStore의 getSnapshot이 매번 같은 참조를 돌려주도록 하는 안정된 빈 배열. */
export const EMPTY_WISHLIST: number[] = [];

/**
 * 백엔드에 wishlist API가 없어서(docs/frontend-migration-plan.md 참고) localStorage로만
 * 구현한다. memberId별로 키를 분리해 계정마다 찜 목록이 따로 유지되게 한다.
 */
function key(memberId: number): string {
  return WISHLIST_PREFIX + memberId;
}

// raw localStorage 문자열이 바뀌지 않았으면 같은 배열 참조를 돌려준다 —
// useSyncExternalStore는 getSnapshot이 매 호출 새 참조를 주면 무한 재렌더를 일으킴.
const parsedCache = new Map<number, { raw: string | null; parsed: number[] }>();

export function getWishlist(memberId: number): number[] {
  if (typeof window === "undefined") return EMPTY_WISHLIST;
  const raw = localStorage.getItem(key(memberId));
  const cached = parsedCache.get(memberId);
  if (cached && cached.raw === raw) return cached.parsed;

  let parsed: number[] = EMPTY_WISHLIST;
  if (raw) {
    try {
      const value = JSON.parse(raw);
      if (Array.isArray(value)) parsed = value;
    } catch {
      parsed = EMPTY_WISHLIST;
    }
  }
  parsedCache.set(memberId, { raw, parsed });
  return parsed;
}

function setWishlist(memberId: number, dropIds: number[]): void {
  localStorage.setItem(key(memberId), JSON.stringify(dropIds));
  notify();
}

export function isWishlisted(memberId: number, dropId: number): boolean {
  return getWishlist(memberId).includes(dropId);
}

export function toggleWishlist(memberId: number, dropId: number): void {
  const current = getWishlist(memberId);
  const next = current.includes(dropId)
    ? current.filter((id) => id !== dropId)
    : [...current, dropId];
  setWishlist(memberId, next);
}

export function removeFromWishlist(memberId: number, dropId: number): void {
  setWishlist(
    memberId,
    getWishlist(memberId).filter((id) => id !== dropId),
  );
}

type Listener = () => void;
const listeners = new Set<Listener>();

function notify(): void {
  for (const listener of listeners) listener();
}

export function subscribeWishlist(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
