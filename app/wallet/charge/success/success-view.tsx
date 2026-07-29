"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { COLORS } from "@/lib/theme";
import * as paymentApi from "@/lib/api/payment";
import { ApiException } from "@/lib/api/types";

type ViewState =
  | { kind: "confirming" }
  | { kind: "polling" }
  | { kind: "pending"; message: string }
  | { kind: "done"; balanceAfter: number }
  | { kind: "error"; message: string };

const POLL_INTERVAL_MS = 5000;
const POLL_MAX_ATTEMPTS = 12; // 5초 * 12 = 최대 1분

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function ChargeSuccessView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [state, setState] = useState<ViewState>({ kind: "confirming" });
  const startedRef = useRef(false);
  // 드롭 구매 중 잔액 부족으로 충전하러 온 경우, 완료 후 예치금 화면 대신 하던 주문으로 되돌아간다.
  const returnTo = searchParams.get("returnTo");
  const destination = returnTo || "/wallet";

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    async function pollStatus(id: number, attempt: number): Promise<void> {
      if (attempt >= POLL_MAX_ATTEMPTS) {
        setState({
          kind: "pending",
          message: "충전 결과 확인이 지연되고 있습니다. 잠시 후 예치금 화면에서 다시 확인해주세요.",
        });
        return;
      }
      await sleep(POLL_INTERVAL_MS);
      const status = await paymentApi.getChargeStatus(id);
      if (status.status === "DONE") {
        const account = await paymentApi.getDepositAccount();
        setState({ kind: "done", balanceAfter: account.balance });
      } else if (status.status === "FAILED" || status.status === "EXPIRED") {
        setState({ kind: "error", message: status.failureReason ?? "충전에 실패했습니다." });
      } else {
        await pollStatus(id, attempt + 1);
      }
    }

    async function run() {
      const paymentKey = searchParams.get("paymentKey");
      const orderId = searchParams.get("orderId");
      const amount = searchParams.get("amount");

      if (!paymentKey || !orderId || !amount) {
        setState({ kind: "error", message: "결제 정보가 올바르지 않습니다." });
        return;
      }

      const chargeRequestIdRaw = sessionStorage.getItem(`toss-charge:${orderId}`);
      const chargeRequestId = chargeRequestIdRaw ? Number(chargeRequestIdRaw) : null;

      try {
        const res = await paymentApi.confirmCharge({
          paymentKey,
          orderId,
          amount: Number(amount),
        });
        setState({ kind: "done", balanceAfter: res.balanceAfter });
      } catch (err) {
        if (err instanceof ApiException && err.code === "P008") {
          if (chargeRequestId) {
            setState({ kind: "polling" });
            await pollStatus(chargeRequestId, 0);
          } else {
            setState({
              kind: "pending",
              message: "결제 결과를 확인 중입니다. 잠시 후 예치금 화면에서 확인해주세요.",
            });
          }
          return;
        }
        setState({
          kind: "error",
          message: err instanceof ApiException ? err.message : "충전 승인에 실패했습니다.",
        });
      }
    }
    run();
  }, [searchParams]);

  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6 text-center">
      {state.kind === "confirming" && (
        <p className="text-sm" style={{ color: COLORS.muted }}>
          결제 승인을 확인하는 중입니다...
        </p>
      )}

      {state.kind === "polling" && (
        <p className="text-sm" style={{ color: COLORS.info }}>
          결제 결과를 확인 중입니다. 잠시만 기다려주세요...
        </p>
      )}

      {state.kind === "pending" && (
        <>
          <p className="text-sm" style={{ color: COLORS.info }}>
            {state.message}
          </p>
          <button
            onClick={() => router.replace(destination)}
            className="px-5 py-2.5 rounded-lg text-sm font-semibold"
            style={{ background: COLORS.accent, color: COLORS.bg }}
          >
            {returnTo ? "돌아가서 계속하기" : "예치금으로 이동"}
          </button>
        </>
      )}

      {state.kind === "done" && (
        <>
          <p className="text-lg font-bold" style={{ color: COLORS.text }}>
            충전이 완료되었습니다
          </p>
          <p className="text-sm" style={{ color: COLORS.muted }}>
            현재 잔액 {state.balanceAfter.toLocaleString()}원
          </p>
          <button
            onClick={() => router.replace(destination)}
            className="px-5 py-2.5 rounded-lg text-sm font-semibold"
            style={{ background: COLORS.accent, color: COLORS.bg }}
          >
            {returnTo ? "돌아가서 계속하기" : "예치금으로 이동"}
          </button>
        </>
      )}

      {state.kind === "error" && (
        <>
          <p className="text-sm" style={{ color: "#E0554F" }}>
            {state.message}
          </p>
          <button
            onClick={() => router.replace("/wallet/charge")}
            className="px-5 py-2.5 rounded-lg text-sm font-semibold"
            style={{ background: COLORS.accent, color: COLORS.bg }}
          >
            다시 시도
          </button>
        </>
      )}
    </div>
  );
}
