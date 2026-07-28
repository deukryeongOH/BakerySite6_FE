import { Suspense } from "react";
import { BackHeader } from "@/components/back-header";
import { COLORS } from "@/lib/theme";
import { ChargeSuccessView } from "./success-view";

export default function ChargeSuccessPage() {
  return (
    <div className="flex flex-col flex-1 min-h-0" style={{ background: COLORS.bg }}>
      <BackHeader title="충전 결과" href="/wallet" />
      <Suspense
        fallback={
          <div className="flex-1 flex items-center justify-center">
            <p className="text-sm" style={{ color: COLORS.muted }}>
              확인 중...
            </p>
          </div>
        }
      >
        <ChargeSuccessView />
      </Suspense>
    </div>
  );
}
