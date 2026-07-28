"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { BackHeader } from "@/components/back-header";
import { COLORS } from "@/lib/theme";
import * as dropApi from "@/lib/api/drop";
import { ApiException } from "@/lib/api/types";

const inputClass = "w-full px-4 py-3 rounded-lg text-sm outline-none";
const inputStyle = {
  background: COLORS.surface,
  color: COLORS.text,
  border: `1px solid ${COLORS.border}`,
};

/** "2026-08-01T10:00:00" -> "2026-08-01T10:00" (datetime-local input이 받는 포맷) */
function toDatetimeLocal(iso: string): string {
  return iso.slice(0, 16);
}

export default function EditDropPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const params = useParams<{ dropId: string }>();
  const dropId = Number(params.dropId);

  // 판매자당 드롭 수가 적어 단건 조회 API 없이 목록에서 찾는 방식으로 처리한다.
  const myDropsQuery = useQuery({
    queryKey: ["myDrops"],
    queryFn: () => dropApi.getMyDrops(),
  });
  const drop = myDropsQuery.data?.find((d) => d.dropId === dropId) ?? null;

  const [form, setForm] = useState({
    name: "",
    description: "",
    imageUrl: "",
    price: "",
    totalQuantity: "",
    limitQuantity: "",
    dropStart: "",
    dropEnd: "",
  });
  const [pickupDates, setPickupDates] = useState<string[]>([""]);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    function sync() {
      if (drop && !initialized) {
        setForm({
          name: drop.name,
          description: drop.description,
          imageUrl: drop.imageUrl,
          price: String(drop.price),
          totalQuantity: String(drop.totalQuantity),
          limitQuantity: String(drop.limitQuantity),
          dropStart: toDatetimeLocal(drop.dropStart),
          dropEnd: toDatetimeLocal(drop.dropEnd),
        });
        setPickupDates(drop.pickUpAvailableDates.length > 0 ? drop.pickUpAvailableDates : [""]);
        setInitialized(true);
      }
    }
    sync();
  }, [drop, initialized]);

  function updatePickupDate(i: number, value: string) {
    setPickupDates((dates) => dates.map((d, idx) => (idx === i ? value : d)));
  }

  function addPickupDate() {
    setPickupDates((dates) => [...dates, ""]);
  }

  function removePickupDate(i: number) {
    setPickupDates((dates) => dates.filter((_, idx) => idx !== i));
  }

  const updateMutation = useMutation({
    mutationFn: () =>
      dropApi.updateDrop(dropId, {
        name: form.name,
        description: form.description,
        imageUrl: form.imageUrl,
        pickUpAvailableDates: pickupDates.filter((d) => d !== ""),
        dropStart: `${form.dropStart}:00`,
        dropEnd: `${form.dropEnd}:00`,
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
    updateMutation.mutate();
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-y-auto" style={{ background: COLORS.bg }}>
      <BackHeader title="드롭 수정" href="/seller/dashboard" />

      {myDropsQuery.isLoading && (
        <p className="px-4 py-4 text-sm" style={{ color: COLORS.muted }}>
          불러오는 중...
        </p>
      )}
      {!myDropsQuery.isLoading && !drop && (
        <p className="px-4 py-4 text-sm" style={{ color: "#E0554F" }}>
          드롭을 찾을 수 없습니다.
        </p>
      )}

      {drop && (
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
          <p className="text-xs" style={{ color: COLORS.accent }}>
            ⚠️ 저장하면 남은 재고가 총 수량 값으로 초기화됩니다(이미 판매된 수량은 반영되지 않음).
          </p>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs" style={{ color: COLORS.muted }}>
              드롭 시작 일시
            </label>
            <input
              required
              type="datetime-local"
              value={form.dropStart}
              onChange={(e) => setForm((f) => ({ ...f, dropStart: e.target.value }))}
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
              value={form.dropEnd}
              onChange={(e) => setForm((f) => ({ ...f, dropEnd: e.target.value }))}
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

          {updateMutation.isError && (
            <p className="text-xs" style={{ color: "#E0554F" }}>
              {updateMutation.error instanceof ApiException
                ? updateMutation.error.message
                : "드롭 수정에 실패했습니다."}
            </p>
          )}

          <button
            type="submit"
            disabled={updateMutation.isPending}
            className="w-full py-3.5 rounded-lg text-sm font-bold disabled:opacity-60"
            style={{ background: COLORS.accent, color: COLORS.bg }}
          >
            {updateMutation.isPending ? "저장 중..." : "저장"}
          </button>
        </form>
      )}
    </div>
  );
}
