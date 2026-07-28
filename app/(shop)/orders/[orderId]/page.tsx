import { BackHeader } from "@/components/back-header";
import { COLORS } from "@/lib/theme";

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;
  return (
    <div className="flex flex-col flex-1" style={{ background: COLORS.bg }}>
      <BackHeader title="주문 상세" href="/orders" />
      <div className="flex-1 flex items-center justify-center">
        <p className="text-sm" style={{ color: COLORS.muted }}>
          주문 #{orderId} 화면은 아직 준비 중입니다
        </p>
      </div>
    </div>
  );
}
