import { COLORS } from "@/lib/theme";
import type { OrderStatus } from "@/lib/types";

const STATUS_MAP: Record<OrderStatus, { bg: string; fg: string }> = {
  픽업대기: { bg: COLORS.accentSoft, fg: COLORS.accent },
  구매확정: { bg: COLORS.greenSoft, fg: COLORS.green },
  취소: { bg: "#1a1a1a", fg: COLORS.muted },
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const { bg, fg } = STATUS_MAP[status];
  return (
    <span
      className="text-[11px] font-semibold px-2 py-0.5 rounded"
      style={{ background: bg, color: fg }}
    >
      {status}
    </span>
  );
}
