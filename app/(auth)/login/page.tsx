import Link from "next/link";
import { COLORS } from "@/lib/theme";

export default function LoginPage() {
  return (
    <div
      className="flex-1 flex flex-col items-center justify-center px-8 gap-10"
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
      <div className="w-full flex flex-col gap-3">
        <Link
          href="/"
          className="w-full py-3.5 rounded-lg flex items-center justify-center gap-2 text-sm font-semibold"
          style={{ background: "#FEE500", color: "#191919" }}
        >
          <span>💬</span> 카카오로 시작하기
        </Link>
        <Link
          href="/"
          className="w-full py-3.5 rounded-lg flex items-center justify-center gap-2 text-sm font-semibold"
          style={{ background: COLORS.text, color: "#191919" }}
        >
          <span className="font-bold">G</span> Google로 시작하기
        </Link>
      </div>
    </div>
  );
}
