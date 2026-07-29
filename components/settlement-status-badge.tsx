import { COLORS } from "@/lib/theme";

const FAILED_COLOR = "#E0554F";

/** 정산(Settlement) 상태 + 배치(Spring Batch) 실행 상태 공용 배지. 매핑에 없는 값은 muted로 fallback. */
const SETTLEMENT_STATUS_MAP: Record<string, { bg: string; fg: string }> = {
  READY: { bg: COLORS.accentSoft, fg: COLORS.accent },
  ON_HOLD: { bg: "#1a1a1a", fg: COLORS.muted },
  PAYING: { bg: COLORS.accentSoft, fg: COLORS.accent },
  COMPLETED: { bg: COLORS.greenSoft, fg: COLORS.green },
  FAILED: { bg: "#1a1a1a", fg: FAILED_COLOR },
  STARTING: { bg: COLORS.accentSoft, fg: COLORS.accent },
  STARTED: { bg: COLORS.accentSoft, fg: COLORS.accent },
  STOPPING: { bg: "#1a1a1a", fg: COLORS.muted },
  STOPPED: { bg: "#1a1a1a", fg: COLORS.muted },
  ABANDONED: { bg: "#1a1a1a", fg: FAILED_COLOR },
  UNKNOWN: { bg: "#1a1a1a", fg: COLORS.muted },
};

export function SettlementStatusBadge({ status }: { status: string }) {
  const { bg, fg } = SETTLEMENT_STATUS_MAP[status] ?? { bg: "#1a1a1a", fg: COLORS.muted };
  return (
    <span className="text-[11px] font-semibold px-2 py-0.5 rounded shrink-0" style={{ background: bg, color: fg }}>
      {status}
    </span>
  );
}

const PAYOUT_STATUS_MAP: Record<string, { bg: string; fg: string }> = {
  REQUESTED: { bg: "#1a1a1a", fg: COLORS.muted },
  PROCESSING: { bg: COLORS.accentSoft, fg: COLORS.accent },
  COMPLETED: { bg: COLORS.greenSoft, fg: COLORS.green },
  FAILED: { bg: "#1a1a1a", fg: FAILED_COLOR },
};

export function PayoutStatusBadge({ status }: { status: string }) {
  const { bg, fg } = PAYOUT_STATUS_MAP[status] ?? { bg: "#1a1a1a", fg: COLORS.muted };
  return (
    <span className="text-[11px] font-semibold px-2 py-0.5 rounded shrink-0" style={{ background: bg, color: fg }}>
      {status}
    </span>
  );
}
