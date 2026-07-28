import { COLORS } from "@/lib/theme";

export default function MyPage() {
  return (
    <div className="flex flex-col flex-1" style={{ background: COLORS.bg }}>
      <div className="px-4 pt-12 pb-4 flex-shrink-0">
        <h1 className="text-xl font-bold" style={{ color: COLORS.text }}>
          마이페이지
        </h1>
      </div>
      <div className="flex-1 flex items-center justify-center">
        <p className="text-sm" style={{ color: COLORS.muted }}>
          이 화면은 아직 준비 중입니다
        </p>
      </div>
    </div>
  );
}
