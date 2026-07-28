"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Check, Minus, Plus } from "lucide-react";
import { COLORS } from "@/lib/theme";
import { BreadBox } from "@/components/bread-box";
import * as dropApi from "@/lib/api/drop";
import * as cartApi from "@/lib/api/cart";
import * as orderApi from "@/lib/api/order";
import * as paymentApi from "@/lib/api/payment";
import { ApiException } from "@/lib/api/types";
import { fmtPickup } from "@/lib/format";

export function OrderView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dropId = Number(searchParams.get("dropId"));
  const dropIdValid = Number.isFinite(dropId) && dropId > 0;

  const dropQuery = useQuery({
    queryKey: ["drop-info", dropId],
    queryFn: () => dropApi.getDropInfo(dropId),
    enabled: dropIdValid,
  });

  const accountQuery = useQuery({
    queryKey: ["deposit-account"],
    queryFn: paymentApi.getDepositAccount,
  });

  const drop = dropQuery.data;
  const maxQty = drop ? Math.max(1, Math.min(drop.limitQuantity, drop.remainQuantity)) : 1;
  const [qty, setQty] = useState(1);
  const [pickupDate, setPickupDate] = useState<string | null>(null);
  // 사용자가 아직 고르지 않았으면 첫 번째 픽업 가능일을 기본값으로 취급한다(effect 없이 렌더 중 파생).
  const effectivePickupDate = pickupDate ?? drop?.pickupDates[0] ?? null;

  const purchaseMutation = useMutation({
    mutationFn: async () => {
      if (!effectivePickupDate) throw new ApiException("OR005", "픽업 날짜를 선택해야 합니다.");
      await dropApi.lockStart(dropId, qty);
      await cartApi.createCart({ dropId, quantity: qty });
      await cartApi.selectPickupDate(effectivePickupDate);
      return orderApi.createOrder();
    },
    onSuccess: (res) => router.push(`/order/complete?orderId=${res.orderId}`),
  });

  if (!dropIdValid) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-sm" style={{ color: COLORS.muted }}>
          잘못된 접근입니다.
        </p>
      </div>
    );
  }

  if (dropQuery.isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-sm" style={{ color: COLORS.muted }}>
          불러오는 중...
        </p>
      </div>
    );
  }

  if (dropQuery.isError || !drop) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-sm" style={{ color: "#E0554F" }}>
          {dropQuery.error instanceof ApiException
            ? dropQuery.error.message
            : "드롭 정보를 불러오지 못했습니다."}
        </p>
      </div>
    );
  }

  const total = drop.price * qty;
  const balance = accountQuery.data?.balance ?? 0;
  const insufficient = accountQuery.data !== undefined && balance < total;
  const afterBalance = balance - total;

  function errorMessage(err: unknown) {
    if (err instanceof ApiException) return err.message;
    return "주문에 실패했습니다.";
  }

  return (
    <>
      <div className="flex-1 overflow-y-auto">
        {/* Product */}
        <div
          className="mx-4 mt-4 p-3 rounded-xl flex gap-3 items-center"
          style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}` }}
        >
          <BreadBox
            className="w-[72px] h-[72px] rounded-lg flex-shrink-0"
            src={drop.imageUrl}
            label={drop.name}
          />
          <div className="flex-1">
            <p className="text-sm font-semibold" style={{ color: COLORS.text }}>
              {drop.name}
            </p>
            <p className="text-sm" style={{ color: COLORS.text }}>
              {drop.price.toLocaleString()}원
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              className="w-7 h-7 rounded-full flex items-center justify-center"
              style={{ background: COLORS.border, color: COLORS.text }}
            >
              <Minus size={13} />
            </button>
            <span className="text-sm font-semibold w-4 text-center" style={{ color: COLORS.text }}>
              {qty}
            </span>
            <button
              onClick={() => setQty((q) => Math.min(maxQty, q + 1))}
              disabled={qty >= maxQty}
              className="w-7 h-7 rounded-full flex items-center justify-center"
              style={{
                background: qty >= maxQty ? COLORS.surface : COLORS.accentSoft,
                color: qty >= maxQty ? COLORS.disabled : COLORS.text,
              }}
            >
              <Plus size={13} />
            </button>
          </div>
        </div>
        {qty >= maxQty && (
          <p className="text-xs text-center mt-1" style={{ color: COLORS.muted }}>
            최대 {maxQty}개 (1인 구매 제한 또는 재고)
          </p>
        )}

        {/* Pickup date */}
        <div className="px-4 mt-5">
          <h2 className="text-base font-semibold mb-0.5" style={{ color: COLORS.text }}>
            픽업 날짜를 선택해주세요
          </h2>
          <p className="text-xs mb-4" style={{ color: COLORS.muted }}>
            선택한 날짜에 매장에서 수령합니다
          </p>

          <div className="flex gap-2 mb-3 overflow-x-auto pb-1">
            {drop.pickupDates.map((d) => {
              const isSel = effectivePickupDate === d;
              return (
                <button
                  key={d}
                  onClick={() => setPickupDate(d)}
                  className="px-3 py-2 rounded-lg text-sm flex-shrink-0"
                  style={{
                    background: isSel ? COLORS.accent : "transparent",
                    color: isSel ? COLORS.bg : COLORS.text,
                    border: isSel ? "none" : `1.5px solid ${COLORS.border}`,
                    fontWeight: isSel ? 700 : 400,
                  }}
                >
                  {fmtPickup(d)}
                </button>
              );
            })}
          </div>

          {effectivePickupDate && (
            <div
              className="p-3 rounded-xl"
              style={{ background: COLORS.accentSoft, border: `1px solid ${COLORS.border}` }}
            >
              <div className="flex items-center gap-2">
                <Check size={13} color={COLORS.accent} />
                <span className="text-sm font-medium" style={{ color: COLORS.text }}>
                  {fmtPickup(effectivePickupDate)} 방문
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Payment summary */}
        <div
          className="mx-4 mt-4 p-4 rounded-xl"
          style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}` }}
        >
          <div className="flex justify-between py-1.5">
            <span className="text-sm" style={{ color: COLORS.muted }}>
              상품 금액
            </span>
            <span className="text-sm" style={{ color: COLORS.text }}>
              {total.toLocaleString()}원
            </span>
          </div>
          <div className="my-2" style={{ borderTop: `1px solid ${COLORS.border}` }} />
          <div className="flex justify-between items-center py-1">
            <span className="text-sm font-semibold" style={{ color: COLORS.text }}>
              총 결제 금액
            </span>
            <span className="text-xl font-bold" style={{ color: COLORS.text }}>
              {total.toLocaleString()}원
            </span>
          </div>
        </div>

        {/* Wallet */}
        <div
          className="mx-4 mt-3 mb-6 p-4 rounded-xl"
          style={{ background: COLORS.accentSoft, border: `1.5px solid ${insufficient ? COLORS.accent : COLORS.border}` }}
        >
          <div className="flex items-center gap-2 mb-3">
            <span className="text-sm font-semibold" style={{ color: COLORS.text }}>
              예치금 결제
            </span>
          </div>
          <div className="flex justify-between py-1">
            <span className="text-sm" style={{ color: COLORS.muted }}>
              현재 잔액
            </span>
            <span className="text-sm font-semibold" style={{ color: insufficient ? COLORS.accent : COLORS.text }}>
              {balance.toLocaleString()}원
            </span>
          </div>
          {insufficient ? (
            <div className="flex justify-between py-1">
              <span className="text-sm font-semibold" style={{ color: COLORS.accent }}>
                {(total - balance).toLocaleString()}원 부족
              </span>
            </div>
          ) : (
            <div className="flex justify-between py-1">
              <span className="text-sm" style={{ color: COLORS.muted }}>
                결제 후 잔액
              </span>
              <span className="text-sm" style={{ color: COLORS.muted }}>
                {afterBalance.toLocaleString()}원
              </span>
            </div>
          )}
        </div>

        {purchaseMutation.isError && (
          <p className="text-xs text-center mb-4" style={{ color: "#E0554F" }}>
            {errorMessage(purchaseMutation.error)}
          </p>
        )}
      </div>

      <div
        className="px-4 py-3 flex-shrink-0"
        style={{ background: COLORS.surface, borderTop: `1px solid ${COLORS.border}` }}
      >
        <button
          onClick={() => (insufficient ? router.push("/wallet/charge") : purchaseMutation.mutate())}
          disabled={purchaseMutation.isPending || (!insufficient && !effectivePickupDate)}
          className="w-full py-3.5 rounded-lg text-sm font-bold disabled:opacity-60"
          style={{ background: COLORS.accent, color: COLORS.bg }}
        >
          {purchaseMutation.isPending
            ? "결제 처리 중..."
            : insufficient
              ? "충전하고 결제하기"
              : !effectivePickupDate
                ? "픽업 날짜를 선택해주세요"
                : `${total.toLocaleString()}원 결제하기`}
        </button>
      </div>
    </>
  );
}
