import Link from "next/link";
import { Check } from "lucide-react";
import { COLORS } from "@/lib/theme";

export default function OrderCompletePage() {
  return (
    <div
      className="flex-1 flex flex-col items-center justify-center px-6 gap-6"
      style={{ background: COLORS.bg }}
    >
      <div
        className="w-16 h-16 rounded-full flex items-center justify-center"
        style={{ background: COLORS.greenSoft, border: `2px solid ${COLORS.green}` }}
      >
        <Check size={28} color={COLORS.green} />
      </div>
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-2 font-serif" style={{ color: COLORS.text }}>
          결제 완료!
        </h1>
        <p className="text-sm" style={{ color: COLORS.muted }}>
          주문이 성공적으로 접수되었습니다
        </p>
      </div>
      <div className="w-full flex flex-col gap-2">
        <Link
          href="/orders"
          className="w-full py-3.5 rounded-lg text-sm font-bold text-center"
          style={{ background: COLORS.accent, color: COLORS.bg }}
        >
          주문 내역 보기
        </Link>
        <Link
          href="/"
          className="w-full py-3 rounded-lg text-sm text-center"
          style={{ border: `1px solid ${COLORS.border}`, color: COLORS.text }}
        >
          홈으로
        </Link>
      </div>
    </div>
  );
}
