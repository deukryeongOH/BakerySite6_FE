"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { BackHeader } from "@/components/back-header";
import { COLORS } from "@/lib/theme";
import * as sellerApi from "@/lib/api/seller";
import { getSellerId } from "@/lib/seller/seller-storage";
import { useAuth } from "@/lib/auth/auth-context";
import type { ApplicationStatus } from "@/lib/api/seller";

const STATUS_LABEL: Record<ApplicationStatus, string> = {
  PENDING: "승인 대기",
  APPROVED: "승인 완료",
  REJECTED: "반려됨",
};

export default function SellerDashboardPage() {
  const { memberId } = useAuth();

  // getSellerId()는 localStorage를 읽는다 — SSR에는 없으므로 렌더 중
  // 직접 호출하면 하이드레이션 불일치가 난다. mount 이후로 미룬다.
  const [sellerId, setSellerId] = useState<number | null>(null);
  useEffect(() => {
    function sync() {
      setSellerId(memberId !== null ? getSellerId(memberId) : null);
    }
    sync();
  }, [memberId]);

  const sellerQuery = useQuery({
    queryKey: ["seller", sellerId],
    queryFn: () => sellerApi.getSeller(sellerId!),
    enabled: sellerId !== null,
  });

  // GET /sellers/{id}는 인증 없이 누구나 조회 가능한 공개 API라, 로컬에 저장된
  // sellerId가 실제로 지금 로그인한 memberId 소유인지 확인한다 — 예전 키 스킴이나
  // 다른 계정이 같은 브라우저를 쓴 경우 등으로 어긋날 수 있어서.
  const seller =
    sellerQuery.data && sellerQuery.data.memberId === memberId ? sellerQuery.data : null;
  const hasApplication = sellerId !== null && seller !== null;

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-y-auto" style={{ background: COLORS.bg }}>
      <BackHeader title="판매자 대시보드" href="/" />

      <div className="flex-1 px-4 py-4 flex flex-col gap-4">
        {sellerId !== null && sellerQuery.isLoading && (
          <p className="text-sm" style={{ color: COLORS.muted }}>
            불러오는 중...
          </p>
        )}
        {sellerId !== null && sellerQuery.isError && (
          <p className="text-sm" style={{ color: "#E0554F" }}>
            판매자 정보를 불러오지 못했습니다.
          </p>
        )}

        {!sellerQuery.isLoading && !hasApplication && (
          <div className="flex flex-col items-center justify-center gap-4 py-16">
            <p className="text-sm" style={{ color: COLORS.muted }}>
              아직 판매자 입점 신청 내역이 없습니다.
            </p>
            <Link
              href="/seller/register"
              className="px-5 py-2.5 rounded-lg text-sm font-semibold"
              style={{ background: COLORS.accentSoft, color: COLORS.accent }}
            >
              입점 신청하기
            </Link>
          </div>
        )}

        {seller && (
          <div
            className="rounded-xl p-4 flex flex-col gap-2"
            style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}` }}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold" style={{ color: COLORS.text }}>
                {seller.bakeryName}
              </span>
              <span
                className="text-[11px] font-semibold px-2 py-0.5 rounded"
                style={{
                  background:
                    seller.applicationStatus === "APPROVED"
                      ? COLORS.greenSoft
                      : seller.applicationStatus === "REJECTED"
                        ? "#1a1a1a"
                        : COLORS.accentSoft,
                  color:
                    seller.applicationStatus === "APPROVED"
                      ? COLORS.green
                      : seller.applicationStatus === "REJECTED"
                        ? COLORS.muted
                        : COLORS.accent,
                }}
              >
                {STATUS_LABEL[seller.applicationStatus]}
              </span>
            </div>
            <p className="text-xs" style={{ color: COLORS.muted }}>
              사업자등록번호 {seller.businessNumber}
            </p>
            <p className="text-xs" style={{ color: COLORS.muted }}>
              정산 계좌 {seller.settlementBankCode} {seller.settlementAccountNumberMasked}
              {seller.accountVerified ? " (인증됨)" : " (미인증)"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
