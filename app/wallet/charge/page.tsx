"use client";

import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { BackHeader } from "@/components/back-header";
import { COLORS } from "@/lib/theme";
import * as paymentApi from "@/lib/api/payment";
import { requestTossCharge } from "@/lib/payment/toss";
import { ApiException } from "@/lib/api/types";

const AMOUNTS = [10000, 30000, 50000, 100000];

export default function ChargePage() {
  const [selected, setSelected] = useState(50000);
  const [custom, setCustom] = useState("");
  const finalAmount = custom ? parseInt(custom) || 0 : selected;

  const accountQuery = useQuery({
    queryKey: ["deposit-account"],
    queryFn: paymentApi.getDepositAccount,
  });

  const chargeMutation = useMutation({
    mutationFn: async (amount: number) => {
      const charge = await paymentApi.createCharge(amount);
      // 성공 콜백에서 5-5(충전 상태 조회, chargeRequestId 필요)를 폴링할 수 있도록
      // pgOrderId → chargeRequestId 매핑을 세션에 남겨둔다(리다이렉트 쿼리엔 없음).
      sessionStorage.setItem(`toss-charge:${charge.pgOrderId}`, String(charge.chargeRequestId));
      await requestTossCharge({
        amount: charge.amount,
        orderId: charge.pgOrderId,
        orderName: charge.orderName,
        successUrl: `${window.location.origin}/wallet/charge/success`,
        failUrl: `${window.location.origin}/wallet/charge/fail`,
      });
    },
  });

  const disabled = finalAmount <= 0 || accountQuery.data?.hasChargeInProgress === true;

  function errorMessage(err: unknown) {
    if (err instanceof ApiException) return err.message;
    return "충전 요청에 실패했습니다.";
  }

  return (
    <div className="flex flex-col flex-1 min-h-0" style={{ background: COLORS.bg }}>
      <BackHeader title="충전" />

      <div className="flex-1 overflow-y-auto px-4 pt-5">
        <div
          className="p-4 rounded-xl mb-5"
          style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}` }}
        >
          <p className="text-xs mb-1" style={{ color: COLORS.muted }}>
            현재 잔액
          </p>
          <p className="text-2xl font-bold" style={{ color: COLORS.text }}>
            {accountQuery.data ? `${accountQuery.data.balance.toLocaleString()}원` : "불러오는 중..."}
          </p>
        </div>

        {accountQuery.data?.hasChargeInProgress && (
          <p className="text-xs mb-4" style={{ color: COLORS.info }}>
            진행 중인 충전 건이 있어 새 충전을 시작할 수 없습니다.
          </p>
        )}

        <p className="text-sm font-semibold mb-3" style={{ color: COLORS.text }}>
          충전 금액 선택
        </p>
        <div className="grid grid-cols-2 gap-2 mb-4">
          {AMOUNTS.map((a) => (
            <button
              key={a}
              onClick={() => {
                setSelected(a);
                setCustom("");
              }}
              className="py-3 rounded-xl text-sm font-semibold"
              style={{
                background: selected === a && !custom ? COLORS.accent : COLORS.surface,
                color: selected === a && !custom ? COLORS.bg : COLORS.text,
                border: selected === a && !custom ? "none" : `1px solid ${COLORS.border}`,
              }}
            >
              {a.toLocaleString()}원
            </button>
          ))}
        </div>
        <input
          type="number"
          placeholder="직접 입력 (1,000원 단위, 최소 1,000원 · 최대 500,000원)"
          value={custom}
          onChange={(e) => {
            setCustom(e.target.value);
            setSelected(0);
          }}
          className="w-full py-3 px-4 rounded-xl text-sm outline-none"
          style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, color: COLORS.text }}
        />

        {finalAmount > 0 && accountQuery.data && (
          <div
            className="mt-4 p-3 rounded-xl"
            style={{ background: COLORS.accentSoft, border: `1px solid ${COLORS.border}` }}
          >
            <p className="text-xs mb-1" style={{ color: COLORS.muted }}>
              충전 후 잔액
            </p>
            <p className="text-xl font-bold" style={{ color: COLORS.text }}>
              {(accountQuery.data.balance + finalAmount).toLocaleString()}원
            </p>
          </div>
        )}

        {chargeMutation.isError && (
          <p className="text-xs mt-3" style={{ color: "#E0554F" }}>
            {errorMessage(chargeMutation.error)}
          </p>
        )}
      </div>

      <div className="px-4 py-3 flex-shrink-0" style={{ background: COLORS.surface, borderTop: `1px solid ${COLORS.border}` }}>
        <button
          onClick={() => chargeMutation.mutate(finalAmount)}
          disabled={disabled || chargeMutation.isPending}
          className="w-full py-3.5 rounded-lg text-sm font-bold disabled:opacity-60"
          style={{ background: COLORS.accent, color: COLORS.bg }}
        >
          {chargeMutation.isPending ? "결제창 여는 중..." : `${finalAmount.toLocaleString()}원 충전하기`}
        </button>
      </div>
    </div>
  );
}
