const ACCESS_TOKEN_KEY = "openbake:accessToken";
const REFRESH_TOKEN_KEY = "openbake:refreshToken";
const MEMBER_ID_KEY = "openbake:memberId";

export interface StoredAuth {
  accessToken: string;
  refreshToken: string;
  memberId: number;
}

export function getTokens(): StoredAuth | null {
  if (typeof window === "undefined") return null;
  const accessToken = localStorage.getItem(ACCESS_TOKEN_KEY);
  const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
  const memberIdRaw = localStorage.getItem(MEMBER_ID_KEY);
  if (!accessToken || !refreshToken || !memberIdRaw) return null;
  return { accessToken, refreshToken, memberId: Number(memberIdRaw) };
}

type Listener = () => void;
const listeners = new Set<Listener>();

function notify(): void {
  for (const listener of listeners) listener();
}

/** localStorage 변경(로그인/로그아웃)을 구독한다. useSyncExternalStore와 함께 사용. */
export function subscribeTokens(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function setTokens(auth: StoredAuth): void {
  localStorage.setItem(ACCESS_TOKEN_KEY, auth.accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, auth.refreshToken);
  localStorage.setItem(MEMBER_ID_KEY, String(auth.memberId));
  notify();
}

export function setAccessToken(accessToken: string): void {
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  notify();
}

export function clearTokens(): void {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(MEMBER_ID_KEY);
  notify();
}
