"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { COLORS } from "@/lib/theme";
import { signup } from "@/lib/api/auth";
import { ApiException } from "@/lib/api/types";

const inputClass = "w-full px-4 py-3 rounded-lg text-sm outline-none";

export default function SignupPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", phoneNumber: "", email: "", password: "" });
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function update(key: keyof typeof form) {
    return (e: ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await signup(form);
      router.push("/login");
    } catch (err) {
      setError(err instanceof ApiException ? err.message : "회원가입에 실패했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex-1 flex flex-col justify-center px-8 gap-6" style={{ background: COLORS.bg }}>
      <div className="text-center">
        <h1 className="text-2xl font-bold font-serif" style={{ color: COLORS.text }}>
          회원가입
        </h1>
      </div>
      <form onSubmit={handleSubmit} className="w-full flex flex-col gap-3">
        <input
          required
          placeholder="이름"
          value={form.name}
          onChange={update("name")}
          className={inputClass}
          style={{ background: COLORS.surface, color: COLORS.text, border: `1px solid ${COLORS.border}` }}
        />
        <input
          required
          placeholder="휴대폰 번호 (010-1234-5678)"
          value={form.phoneNumber}
          onChange={update("phoneNumber")}
          className={inputClass}
          style={{ background: COLORS.surface, color: COLORS.text, border: `1px solid ${COLORS.border}` }}
        />
        <input
          required
          type="email"
          placeholder="이메일"
          value={form.email}
          onChange={update("email")}
          className={inputClass}
          style={{ background: COLORS.surface, color: COLORS.text, border: `1px solid ${COLORS.border}` }}
        />
        <input
          required
          type="password"
          minLength={8}
          maxLength={20}
          placeholder="비밀번호 (8~20자)"
          value={form.password}
          onChange={update("password")}
          className={inputClass}
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
          {isSubmitting ? "가입 중..." : "가입하기"}
        </button>
      </form>
      <p className="text-sm text-center" style={{ color: COLORS.muted }}>
        이미 계정이 있으신가요?{" "}
        <Link href="/login" className="font-semibold" style={{ color: COLORS.accent }}>
          로그인
        </Link>
      </p>
    </div>
  );
}
