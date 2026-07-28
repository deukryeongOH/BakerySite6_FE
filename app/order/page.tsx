import { Suspense } from "react";
import { BackHeader } from "@/components/back-header";
import { COLORS } from "@/lib/theme";
import { OrderView } from "./order-view";

export default function OrderPage() {
  return (
    <div className="flex flex-col flex-1 min-h-0" style={{ background: COLORS.bg }}>
      <BackHeader title="주문/결제" />
      <Suspense
        fallback={
          <div className="flex-1 flex items-center justify-center">
            <p className="text-sm" style={{ color: COLORS.muted }}>
              불러오는 중...
            </p>
          </div>
        }
      >
        <OrderView />
      </Suspense>
    </div>
  );
}
