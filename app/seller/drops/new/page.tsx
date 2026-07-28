"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { BackHeader } from "@/components/back-header";
import { COLORS } from "@/lib/theme";
import * as dropApi from "@/lib/api/drop";
import * as sellerApi from "@/lib/api/seller";
import { useAuth } from "@/lib/auth/auth-context";
import { ApiException } from "@/lib/api/types";

const inputClass = "w-full px-4 py-3 rounded-lg text-sm outline-none";
const inputStyle = {
  background: COLORS.surface,
  color: COLORS.text,
  border: `1px solid ${COLORS.border}`,
};

export default function NewDropPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { memberId } = useAuth();

  const mySellerQuery = useQuery({
    queryKey: ["mySeller"],
    queryFn: sellerApi.getMySeller,
    enabled: memberId !== null,
    retry: false,
  });

  // 승인된 판매자가 아니면 드롭을 등록할 수 없다(백엔드 C002) — 대시보드로 돌려보낸다.
  // isPending을 써야 한다 — enabled:false인 동안엔 isLoading이 false로 평가돼(fetch를
  // 시작조차 안 했으므로), memberId가 아직 안 채워진 첫 렌더에 data===undefined를
  // "미승인"으로 오판해 곧장 리다이렉트해버리는 버그가 났었다(2026-07-28 브라우저 검증).
  useEffect(() => {
    if (mySellerQuery.isPending) return;
    if (mySellerQuery.data?.applicationStatus !== "APPROVED") {
      router.replace("/seller/dashboard");
    }
  }, [mySellerQuery.isPending, mySellerQuery.data, router]);

  const [form, setForm] = useState({
    name: "",
    description: "",
    imageUrl: "",
    price: "",
    totalQuantity: "",
    limitQuantity: "",
    dropPeriodStart: "",
    dropPeriodEnd: "",
  });
  const [pickupDates, setPickupDates] = useState<string[]>([""]);

  function updatePickupDate(i: number, value: string) {
    setPickupDates((dates) => dates.map((d, idx) => (idx === i ? value : d)));
  }

  function addPickupDate() {
    setPickupDates((dates) => [...dates, ""]);
  }

  function removePickupDate(i: number) {
    setPickupDates((dates) => dates.filter((_, idx) => idx !== i));
  }

  const registerMutation = useMutation({
    mutationFn: () =>
      dropApi.registerDrop({
        name: form.name,
        description: form.description,
        imageUrl: form.imageUrl,
        pickUpAvailableDates: pickupDates.filter((d) => d !== ""),
        dropStart: `${form.dropPeriodStart}:00`,
        dropEnd: `${form.dropPeriodEnd}:00`,
        limitQuantity: Number(form.limitQuantity),
        price: Number(form.price),
        totalQuantity: Number(form.totalQuantity),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["myDrops"] });
      router.push("/seller/dashboard");
    },
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    registerMutation.mutate();
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-y-auto" style={{ background: COLORS.bg }}>
      <BackHeader title="드롭 등록" href="/seller/dashboard" />

      <form onSubmit={handleSubmit} className="flex-1 px-4 py-4 flex flex-col gap-3">
        <input
          required
          placeholder="상품명"
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          className={inputClass}
          style={inputStyle}
        />
        <textarea
          required
          placeholder="상품 설명"
          rows={3}
          value={form.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          className={inputClass}
          style={inputStyle}
        />
        <input
          required
          placeholder="이미지 URL"
          value={form.imageUrl}
          onChange={(e) => setForm((f) => ({ ...f, imageUrl: e.target.value }))}
          className={inputClass}
          style={inputStyle}
        />

        <div className="flex gap-2">
          <input
            required
            type="number"
            min={1}
            placeholder="가격"
            value={form.price}
            onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
            className={inputClass}
            style={inputStyle}
          />
          <input
            required
            type="number"
            min={1}
            placeholder="총 수량"
            value={form.totalQuantity}
            onChange={(e) => setForm((f) => ({ ...f, totalQuantity: e.target.value }))}
            className={inputClass}
            style={inputStyle}
          />
          <input
            required
            type="number"
            min={1}
            placeholder="1인당 제한 수량"
            value={form.limitQuantity}
            onChange={(e) => setForm((f) => ({ ...f, limitQuantity: e.target.value }))}
            className={inputClass}
            style={inputStyle}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs" style={{ color: COLORS.muted }}>
            드롭 시작 일시
          </label>
          <input
            required
            type="datetime-local"
            value={form.dropPeriodStart}
            onChange={(e) => setForm((f) => ({ ...f, dropPeriodStart: e.target.value }))}
            className={inputClass}
            style={inputStyle}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs" style={{ color: COLORS.muted }}>
            드롭 마감 일시
          </label>
          <input
            required
            type="datetime-local"
            value={form.dropPeriodEnd}
            onChange={(e) => setForm((f) => ({ ...f, dropPeriodEnd: e.target.value }))}
            className={inputClass}
            style={inputStyle}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs" style={{ color: COLORS.muted }}>
            픽업 가능 날짜 (드롭 마감일 이후여야 함)
          </label>
          {pickupDates.map((date, i) => (
            <div key={i} className="flex gap-2">
              <input
                required
                type="date"
                value={date}
                onChange={(e) => updatePickupDate(i, e.target.value)}
                className={inputClass}
                style={inputStyle}
              />
              {pickupDates.length > 1 && (
                <button
                  type="button"
                  onClick={() => removePickupDate(i)}
                  className="px-3 rounded-lg text-sm"
                  style={{ border: `1px solid ${COLORS.border}`, color: COLORS.muted }}
                >
                  삭제
                </button>
              )}
            </div>
          ))}
          <button
            type="button"
            onClick={addPickupDate}
            className="text-xs text-left font-semibold"
            style={{ color: COLORS.accent }}
          >
            + 날짜 추가
          </button>
        </div>

        {registerMutation.isError && (
          <p className="text-xs" style={{ color: "#E0554F" }}>
            {registerMutation.error instanceof ApiException
              ? registerMutation.error.message
              : "드롭 등록에 실패했습니다."}
          </p>
        )}

        <button
          type="submit"
          disabled={registerMutation.isPending}
          className="w-full py-3.5 rounded-lg text-sm font-bold disabled:opacity-60"
          style={{ background: COLORS.accent, color: COLORS.bg }}
        >
          {registerMutation.isPending ? "등록 중..." : "드롭 등록"}
        </button>
      </form>
    </div>
  );
}
