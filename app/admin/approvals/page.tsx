import { BackHeader } from "@/components/back-header";
import { COLORS } from "@/lib/theme";

export default function AdminApprovalsPage() {
  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-y-auto" style={{ background: COLORS.bg }}>
      <BackHeader title="판매자 승인" href="/" />
      <div className="flex-1 flex items-center justify-center">
        <p className="text-sm" style={{ color: COLORS.muted }}>
          이 화면은 아직 준비 중입니다
        </p>
      </div>
    </div>
  );
}
