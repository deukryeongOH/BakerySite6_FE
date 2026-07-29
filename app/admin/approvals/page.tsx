"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BackHeader } from "@/components/back-header";
import { COLORS } from "@/lib/theme";
import * as sellerApi from "@/lib/api/seller";
import { useAuth } from "@/lib/auth/auth-context";
import { ApiException } from "@/lib/api/types";

const inputStyle = {
  background: COLORS.surface,
  color: COLORS.text,
  border: `1px solid ${COLORS.border}`,
};

export default function AdminApprovalsPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading, role } = useAuth();
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      router.replace("/login");
    } else if (role !== "ADMIN") {
      router.replace("/");
    }
  }, [isLoading, isAuthenticated, role, router]);

  const pendingQuery = useQuery({
    queryKey: ["sellers", "pending"],
    queryFn: () => sellerApi.getPendingSellers("PENDING"),
    enabled: isAuthenticated && role === "ADMIN",
  });

  const statusMutation = useMutation({
    mutationFn: (body: sellerApi.UpdateSellerStatusRequest) =>
      sellerApi.updateSellerStatus(selectedId!, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sellers", "pending"] });
      setSelectedId(null);
      setRejectReason("");
    },
  });

  if (isLoading || !isAuthenticated || role !== "ADMIN") return null;

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-y-auto" style={{ background: COLORS.bg }}>
      <BackHeader title="판매자 승인" href="/" />

      <div className="flex-1 px-4 py-4 flex flex-col gap-3">
        <p className="text-xs" style={{ color: COLORS.muted }}>
          입점 신청 대기 중인 판매자 목록입니다.
        </p>

        {pendingQuery.isLoading && (
          <p className="text-sm" style={{ color: COLORS.muted }}>
            불러오는 중...
          </p>
        )}
        {pendingQuery.isError && (
          <p className="text-sm" style={{ color: "#E0554F" }}>
            {pendingQuery.error instanceof ApiException
              ? pendingQuery.error.message
              : "목록을 불러오지 못했습니다."}
          </p>
        )}
        {pendingQuery.data && pendingQuery.data.length === 0 && (
          <p className="text-sm" style={{ color: COLORS.muted }}>
            대기 중인 신청이 없습니다.
          </p>
        )}

        {pendingQuery.data?.map((seller) => {
          const isSelected = selectedId === seller.sellerId;
          return (
            <div
              key={seller.sellerId}
              className="rounded-xl p-4 flex flex-col gap-2"
              style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}` }}
            >
              <button
                type="button"
                className="flex items-center justify-between text-left"
                onClick={() => {
                  setSelectedId(isSelected ? null : seller.sellerId);
                  setRejectReason("");
                }}
              >
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-semibold" style={{ color: COLORS.text }}>
                    {seller.bakeryName}
                  </span>
                  <span className="text-xs" style={{ color: COLORS.muted }}>
                    사업자등록번호 {seller.businessNumber}
                  </span>
                  <span className="text-xs" style={{ color: COLORS.muted }}>
                    정산 계좌 {seller.settlementBankCode} {seller.settlementAccountNumberMasked}
                    {seller.accountVerified ? " (인증됨)" : " (미인증)"}
                  </span>
                </div>
                <span
                  className="text-[11px] font-semibold px-2 py-0.5 rounded shrink-0"
                  style={{ background: COLORS.accentSoft, color: COLORS.accent }}
                >
                  {seller.applicationStatus}
                </span>
              </button>

              {isSelected && (
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
          );
        })}
      </div>
    </div>
  );
}
