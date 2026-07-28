"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BackHeader } from "@/components/back-header";
import { COLORS } from "@/lib/theme";
import * as sellerApi from "@/lib/api/seller";
import { useAuth } from "@/lib/auth/auth-context";
import { ApiException } from "@/lib/api/types";

const inputClass = "flex-1 px-4 py-3 rounded-lg text-sm outline-none";
const inputStyle = {
  background: COLORS.surface,
  color: COLORS.text,
  border: `1px solid ${COLORS.border}`,
};

export default function AdminApprovalsPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading, role } = useAuth();
  const queryClient = useQueryClient();
  const [sellerIdInput, setSellerIdInput] = useState("");
  const [lookupId, setLookupId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      router.replace("/login");
    } else if (role !== "ADMIN") {
      router.replace("/");
    }
  }, [isLoading, isAuthenticated, role, router]);

  const sellerQuery = useQuery({
    queryKey: ["seller", lookupId],
    queryFn: () => sellerApi.getSeller(lookupId!),
    enabled: lookupId !== null,
  });

  const statusMutation = useMutation({
    mutationFn: (body: sellerApi.UpdateSellerStatusRequest) =>
      sellerApi.updateSellerStatus(lookupId!, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["seller", lookupId] });
      setRejectReason("");
    },
  });

  function handleLookupSubmit(e: FormEvent) {
    e.preventDefault();
    const id = Number(sellerIdInput);
    if (Number.isFinite(id) && id > 0) setLookupId(id);
  }

  if (isLoading || !isAuthenticated || role !== "ADMIN") return null;

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-y-auto" style={{ background: COLORS.bg }}>
      <BackHeader title="판매자 승인" href="/" />

      <div className="flex-1 px-4 py-4 flex flex-col gap-4">
        <p className="text-xs" style={{ color: COLORS.muted }}>
          대기 중인 신청 목록을 조회하는 API가 아직 없어서, 판매자 ID를 직접 입력해 조회합니다.
        </p>

        <form onSubmit={handleLookupSubmit} className="flex gap-2">
          <input
            required
            inputMode="numeric"
            placeholder="판매자 ID"
            value={sellerIdInput}
            onChange={(e) => setSellerIdInput(e.target.value)}
            className={inputClass}
            style={inputStyle}
          />
          <button
            type="submit"
            className="px-4 py-3 rounded-lg text-sm font-semibold"
            style={{ background: COLORS.accentSoft, color: COLORS.accent }}
          >
            조회
          </button>
        </form>

        {sellerQuery.isLoading && (
          <p className="text-sm" style={{ color: COLORS.muted }}>
            불러오는 중...
          </p>
        )}
        {sellerQuery.isError && (
          <p className="text-sm" style={{ color: "#E0554F" }}>
            {sellerQuery.error instanceof ApiException
              ? sellerQuery.error.message
              : "판매자를 찾을 수 없습니다."}
          </p>
        )}

        {sellerQuery.data && (
          <div
            className="rounded-xl p-4 flex flex-col gap-2"
            style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}` }}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold" style={{ color: COLORS.text }}>
                {sellerQuery.data.bakeryName}
              </span>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded" style={{ background: COLORS.accentSoft, color: COLORS.accent }}>
                {sellerQuery.data.applicationStatus}
              </span>
            </div>
            <p className="text-xs" style={{ color: COLORS.muted }}>
              사업자등록번호 {sellerQuery.data.businessNumber}
            </p>
            <p className="text-xs" style={{ color: COLORS.muted }}>
              정산 계좌 {sellerQuery.data.settlementBankCode} {sellerQuery.data.settlementAccountNumberMasked}
              {sellerQuery.data.accountVerified ? " (인증됨)" : " (미인증)"}
            </p>

            {sellerQuery.data.applicationStatus === "PENDING" && (
              <div className="flex flex-col gap-2 pt-3" style={{ borderTop: `1px solid ${COLORS.border}` }}>
                <input
                  placeholder="반려 사유 (반려 시)"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg text-sm outline-none"
                  style={inputStyle}
                />
                {statusMutation.isError && (
                  <p className="text-xs" style={{ color: "#E0554F" }}>
                    {statusMutation.error instanceof ApiException
                      ? statusMutation.error.message
                      : "처리에 실패했습니다."}
                  </p>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={() => statusMutation.mutate({ applicationStatus: "APPROVED" })}
                    disabled={statusMutation.isPending}
                    className="flex-1 py-2.5 rounded-lg text-sm font-semibold disabled:opacity-60"
                    style={{ background: COLORS.accent, color: COLORS.bg }}
                  >
                    승인
                  </button>
                  <button
                    onClick={() =>
                      statusMutation.mutate({
                        applicationStatus: "REJECTED",
                        rejectReason: rejectReason || undefined,
                      })
                    }
                    disabled={statusMutation.isPending}
                    className="flex-1 py-2.5 rounded-lg text-sm disabled:opacity-60"
                    style={{ border: `1px solid ${COLORS.border}`, color: COLORS.text }}
                  >
                    반려
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
