"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import * as authApi from "@/lib/api/auth";
import { clearTokens, getTokens, setTokens, subscribeTokens } from "@/lib/auth/token-storage";

interface AuthContextValue {
  memberId: number | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [memberId, setMemberId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // localStorage는 서버에 없다. useSyncExternalStore의 getServerSnapshot(null)로
  // 렌더한 뒤 하이드레이션 직후 보정되길 기대했으나, 그 보정 effect가 이 값을
  // 구독하는 자식(ShopLayout)의 리다이렉트 effect보다 늦게 실행되는 경쟁
  // 상태가 실제로 발생해(새로고침 시 유효 토큰이 있어도 /login으로 튕김,
  // 2026-07-28 확인) 이 mount effect + 구독 방식으로 되돌렸다.
  useEffect(() => {
    function sync() {
      setMemberId(getTokens()?.memberId ?? null);
      setIsLoading(false);
    }
    sync();
    return subscribeTokens(sync);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await authApi.login({ email, password });
    setTokens({
      accessToken: res.accessToken,
      refreshToken: res.refreshToken,
      memberId: res.memberId,
    });
  }, []);

  const logout = useCallback(async () => {
    const stored = getTokens();
    if (stored) {
      try {
        await authApi.logout(stored.refreshToken);
      } catch {
        // 서버 무효화가 실패해도 로컬 세션은 정리한다
      }
    }
    clearTokens();
    router.push("/login");
  }, [router]);

  return (
    <AuthContext.Provider
      value={{ memberId, isAuthenticated: memberId !== null, isLoading, login, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
