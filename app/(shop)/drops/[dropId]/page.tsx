import { BackHeader } from "@/components/back-header";
import { COLORS } from "@/lib/theme";

export default async function DropDetailPage({
  params,
}: {
  params: Promise<{ dropId: string }>;
}) {
  const { dropId } = await params;
  return (
    <div className="flex flex-col flex-1" style={{ background: COLORS.bg }}>
      <BackHeader title="드롭 상세" href="/" />
      <div className="flex-1 flex items-center justify-center">
        <p className="text-sm" style={{ color: COLORS.muted }}>
          드롭 #{dropId} 화면은 아직 준비 중입니다
        </p>
      </div>
    </div>
  );
}
