import Link from "next/link";
import { Wallet } from "lucide-react";
import { COLORS } from "@/lib/theme";

export default function HomePage() {
  return (
    <div className="flex flex-col flex-1" style={{ background: COLORS.bg }}>
      <div className="flex items-center justify-between px-4 pt-12 pb-3 flex-shrink-0">
        <span className="text-2xl font-bold font-serif" style={{ color: COLORS.text }}>
          오픈베이크
        </span>
        <Link
          href="/wallet"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold"
          style={{
            background: COLORS.accentSoft,
            color: COLORS.accent,
            border: `1px solid ${COLORS.border}`,
          }}
        >
          <Wallet size={13} /> 예치금
        </Link>
      </div>
      <div className="flex-1 flex items-center justify-center">
        <p className="text-sm" style={{ color: COLORS.muted }}>
          이 화면은 아직 준비 중입니다
        </p>
      </div>
    </div>
  );
}
