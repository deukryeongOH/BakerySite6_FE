"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { COLORS } from "@/lib/theme";
import { useAuth } from "@/lib/auth/auth-context";
import { ApiException } from "@/lib/api/types";
import { GoogleSignInButton } from "@/components/google-sign-in-button";

export default function LoginPage() {
  const router = useRouter();
  const { login, loginWithGoogle } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await login(email, password);
      router.push("/");
    } catch (err) {
      setError(err instanceof ApiException ? err.message : "로그인에 실패했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleGoogleCredential(idToken: string) {
    setError(null);
    setIsSubmitting(true);
    try {
      await loginWithGoogle(idToken);
      router.push("/");
    } catch (err) {
      setError(err instanceof ApiException ? err.message : "Google 로그인에 실패했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div
      className="flex-1 flex flex-col items-center justify-center px-8 gap-8"
      style={{ background: COLORS.bg }}
    >
      <div className="flex flex-col items-center gap-4">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl"
          style={{ background: COLORS.accentSoft, border: `1px solid ${COLORS.border}` }}
        >
          🍞
        </div>
        <div className="text-center">
          <h1
            className="text-[32px] font-bold tracking-tight font-serif"
            style={{ color: COLORS.text }}
          >
            오픈베이크
          </h1>
          <p className="text-sm mt-2" style={{ color: COLORS.muted }}>
            매일 오후 2시, 동네 빵집의 한정판
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="w-full flex flex-col gap-3">
        <input
          type="email"
          required
          placeholder="이메일"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-4 py-3 rounded-lg text-sm outline-none"
          style={{ background: COLORS.surface, color: COLORS.text, border: `1px solid ${COLORS.border}` }}
        />
        <input
          type="password"
          required
          placeholder="비밀번호"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-4 py-3 rounded-lg text-sm outline-none"
          style={{ background: COLORS.surface, color: COLORS.text, border: `1px solid ${COLORS.border}` }}
        />
        {error && (
          <p className="text-xs" style={{ color: "#E0554F" }}>
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-3.5 rounded-lg text-sm font-bold disabled:opacity-60"
          style={{ background: COLORS.accent, color: COLORS.bg }}
        >
          {isSubmitting ? "로그인 중..." : "로그인"}
        </button>
      </form>

      <div className="w-full flex items-center gap-3">
        <div className="flex-1 h-px" style={{ background: COLORS.border }} />
        <span className="text-xs" style={{ color: COLORS.muted }}>
          또는
        </span>
        <div className="flex-1 h-px" style={{ background: COLORS.border }} />
      </div>

      <GoogleSignInButton onCredential={handleGoogleCredential} />

      <p className="text-sm" style={{ color: COLORS.muted }}>
        아직 계정이 없으신가요?{" "}
        <Link href="/signup" className="font-semibold" style={{ color: COLORS.accent }}>
          회원가입
        </Link>
      </p>
    </div>
  );
}
