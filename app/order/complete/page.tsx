import { Suspense } from "react";
import { COLORS } from "@/lib/theme";
import { CompleteView } from "./complete-view";

export default function OrderCompletePage() {
  return (
    <div className="flex flex-col flex-1" style={{ background: COLORS.bg }}>
      <Suspense
        fallback={
          <div className="flex-1 flex items-center justify-center">
            <p className="text-sm" style={{ color: COLORS.muted }}>
              불러오는 중...
            </p>
          </div>
        }
      >
        <CompleteView />
      </Suspense>
    </div>
  );
}
