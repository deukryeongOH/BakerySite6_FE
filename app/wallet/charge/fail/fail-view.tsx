"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { COLORS } from "@/lib/theme";

export function ChargeFailView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const message = searchParams.get("message") ?? "결제가 취소되었거나 실패했습니다.";
  // 재시도 화면에서도 원래 돌아갈 곳(returnTo)을 계속 들고 다닌다.
  const returnTo = searchParams.get("returnTo");
  const retryUrl = `/wallet/charge${returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : ""}`;

  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="text-sm" style={{ color: "#E0554F" }}>
        {message}
      </p>
      <button
        onClick={() => router.replace(retryUrl)}
        className="px-5 py-2.5 rounded-lg text-sm font-semibold"
        style={{ background: COLORS.accent, color: COLORS.bg }}
      >
        다시 시도
      </button>
    </div>
  );
}
