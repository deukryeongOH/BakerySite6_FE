import { ANONYMOUS, loadTossPayments, type TossPaymentsSDK } from "@tosspayments/tosspayments-sdk";

let tossPaymentsPromise: Promise<TossPaymentsSDK> | null = null;

function getTossPayments() {
  const clientKey = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY;
  if (!clientKey) throw new Error("NEXT_PUBLIC_TOSS_CLIENT_KEY가 설정되지 않았습니다.");
  if (!tossPaymentsPromise) tossPaymentsPromise = loadTossPayments(clientKey);
  return tossPaymentsPromise;
}

export interface RequestTossChargeParams {
  amount: number;
  orderId: string;
  orderName: string;
  successUrl: string;
  failUrl: string;
}

/** 결제창으로 리다이렉트한다 — 성공/실패 시 successUrl/failUrl로 브라우저가 이동한다. */
export async function requestTossCharge(params: RequestTossChargeParams) {
  const tossPayments = await getTossPayments();
  const payment = tossPayments.payment({ customerKey: ANONYMOUS });
  await payment.requestPayment({
    method: "CARD",
    amount: { currency: "KRW", value: params.amount },
    orderId: params.orderId,
    orderName: params.orderName,
    successUrl: params.successUrl,
    failUrl: params.failUrl,
    card: {
      useEscrow: false,
      flowMode: "DEFAULT",
      useCardPoint: false,
      useAppCardOnly: false,
    },
  });
}
