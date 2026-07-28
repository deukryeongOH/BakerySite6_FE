import { clearTokens, getTokens, setTokens } from "@/lib/auth/token-storage";
import { ApiException, type ApiResponse } from "@/lib/api/types";

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

let reissuePromise: Promise<string> | null = null;

async function reissueAccessToken(): Promise<string> {
  const stored = getTokens();
  if (!stored) throw new ApiException("ME002", "유효하지 않은 인증 토큰입니다.");

  if (!reissuePromise) {
    reissuePromise = fetch(`${BASE_URL}/api/v1/auth/reissue`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: stored.refreshToken }),
    })
      .then((res) => res.json() as Promise<ApiResponse<{ accessToken: string; refreshToken: string }>>)
      .then((json) => {
        if (!json.success) throw new ApiException(json.error.code, json.error.message);
        setTokens({
          memberId: stored.memberId,
          role: stored.role,
          provider: stored.provider,
          accessToken: json.data.accessToken,
          refreshToken: json.data.refreshToken,
        });
        return json.data.accessToken;
      })
      .finally(() => {
        reissuePromise = null;
      });
  }
  return reissuePromise;
}

interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  auth?: boolean;
  /** 성공 응답이 {success,data} 래퍼 없이 최상위로 오는 특수 엔드포인트용(예: GET /drops/{id}/info). */
  unwrapped?: boolean;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, auth = true, unwrapped = false } = options;

  const send = (accessToken?: string) => {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (auth && accessToken) headers.Authorization = `Bearer ${accessToken}`;
    return fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  };

  const stored = auth ? getTokens() : null;
  let res = await send(stored?.accessToken);

  if (auth && res.status === 401 && stored) {
    const cloned = (await res
      .clone()
      .json()
      .catch(() => null)) as ApiResponse<unknown> | null;
    const code = cloned && !cloned.success ? cloned.error.code : undefined;

    if (code === "ME002") {
      try {
        const newAccessToken = await reissueAccessToken();
        res = await send(newAccessToken);
      } catch {
        clearTokens();
        if (typeof window !== "undefined") window.location.href = "/login";
        throw new ApiException("ME002", "유효하지 않은 인증 토큰입니다.");
      }
    }
  }

  if (res.status === 204) return undefined as T;

  if (unwrapped) {
    if (!res.ok) {
      const json = (await res.json().catch(() => null)) as ApiResponse<unknown> | null;
      if (json && !json.success) throw new ApiException(json.error.code, json.error.message);
      throw new ApiException("C001", "요청에 실패했습니다.");
    }
    return res.json() as Promise<T>;
  }

  const json = (await res.json()) as ApiResponse<T>;
  if (!json.success) throw new ApiException(json.error.code, json.error.message);
  return json.data;
}
