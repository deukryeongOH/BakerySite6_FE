import { COLORS } from "@/lib/theme";
import type { DropStatus } from "@/lib/types";

const STATUS_MAP: Record<DropStatus, { label: string; bg: string; fg: string }> = {
  SCHEDULED: { label: "오픈 예정", bg: COLORS.info, fg: "#fff" },
  ON_SALE: { label: "판매중", bg: COLORS.accent, fg: COLORS.bg },
  SOLD_OUT: { label: "품절", bg: COLORS.disabled, fg: COLORS.muted },
  CLOSED: { label: "판매 종료", bg: COLORS.disabled, fg: COLORS.muted },
};

export function DropBadge({ status }: { status: DropStatus }) {
  const { label, bg, fg } = STATUS_MAP[status];
  return (
    <span
      className="text-[11px] font-semibold px-2 py-0.5 rounded-[4px] leading-none"
      style={{ background: bg, color: fg }}
    >
      {label}
    </span>
  );
}
