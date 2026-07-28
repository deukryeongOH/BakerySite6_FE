"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { BackHeader } from "@/components/back-header";
import { COLORS } from "@/lib/theme";
import * as paymentApi from "@/lib/api/payment";

const TYPE_LABEL: Record<paymentApi.TransactionType, string> = {
  CHARGE: "충전",
  PAYMENT: "결제",
  REFUND: "환불",
};

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString("ko-KR", {
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function WalletPage() {
  const [page, setPage] = useState(0);

  const accountQuery = useQuery({
    queryKey: ["deposit-account"],
    queryFn: paymentApi.getDepositAccount,
  });

  const transactionsQuery = useQuery({
    queryKey: ["deposit-transactions", page],
    queryFn: () => paymentApi.getDepositTransactions({ page, size: 20 }),
    // /account가 먼저 계좌를 lazy 생성해야 /transactions가 404(P013) 없이 조회된다.
    enabled: accountQuery.isSuccess,
  });

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-y-auto" style={{ background: COLORS.bg }}>
      <BackHeader title="예치금" href="/" />

      <div
        className="mx-4 my-4 p-5 rounded-2xl flex-shrink-0"
        style={{ background: COLORS.accentSoft, border: `1px solid ${COLORS.accent}40` }}
      >
        <p className="text-sm mb-2" style={{ color: COLORS.muted }}>
          내 예치금
        </p>
        {accountQuery.isLoading && (
          <p className="text-2xl font-bold mb-4" style={{ color: COLORS.text }}>
            불러오는 중...
          </p>
        )}
        {accountQuery.isError && (
          <p className="text-sm mb-4" style={{ color: "#E0554F" }}>
            잔액을 불러오지 못했습니다.
          </p>
        )}
        {accountQuery.data && (
          <p className="text-5xl font-bold mb-4 font-serif" style={{ color: COLORS.accent }}>
            {accountQuery.data.balance.toLocaleString()}원
          </p>
        )}
        <Link
          href="/wallet/charge"
          className="inline-block px-5 py-2 rounded-lg text-sm font-semibold"
          style={{ background: COLORS.text, color: COLORS.bg }}
        >
          충전하기
        </Link>
        {accountQuery.data?.hasChargeInProgress && (
          <p className="text-xs mt-2" style={{ color: COLORS.info }}>
            진행 중인 충전 건이 있습니다. 완료 후 다시 시도해주세요.
          </p>
        )}
      </div>

      <div className="flex-1 px-4 pb-6">
        <p className="text-sm font-semibold mb-3" style={{ color: COLORS.text }}>
          거래 내역
        </p>

        {transactionsQuery.isLoading && (
          <p className="text-sm" style={{ color: COLORS.muted }}>
            불러오는 중...
          </p>
        )}
        {transactionsQuery.isError && (
          <p className="text-sm" style={{ color: "#E0554F" }}>
            거래 내역을 불러오지 못했습니다.
          </p>
        )}
        {transactionsQuery.data?.empty && (
          <p className="text-sm" style={{ color: COLORS.muted }}>
            거래 내역이 없습니다.
          </p>
        )}

        {transactionsQuery.data?.content.map((t, i) => (
          <div key={t.id}>
            <div className="py-3 flex items-start justify-between">
              <div className="flex items-start gap-3">
                <span
                  className="text-[11px] font-semibold px-2 py-0.5 rounded mt-0.5"
                  style={{
                    background:
                      t.transactionType === "CHARGE"
                        ? "#0D2035"
                        : t.transactionType === "REFUND"
                          ? COLORS.greenSoft
                          : COLORS.accentSoft,
                    color:
                      t.transactionType === "CHARGE"
                        ? COLORS.info
                        : t.transactionType === "REFUND"
                          ? COLORS.green
                          : COLORS.accent,
                  }}
                >
                  {TYPE_LABEL[t.transactionType]}
                </span>
                <div>
                  <p className="text-sm font-medium" style={{ color: COLORS.text }}>
                    {t.description}
                  </p>
                  <p className="text-xs" style={{ color: COLORS.muted }}>
                    {fmtDateTime(t.createdAt)}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p
                  className="text-sm font-semibold"
                  style={{ color: t.amount > 0 ? COLORS.info : COLORS.accent }}
                >
                  {t.amount > 0 ? "+" : ""}
                  {t.amount.toLocaleString()}
                </p>
                <p className="text-xs" style={{ color: COLORS.muted }}>
                  잔액 {t.balanceAfter.toLocaleString()}
                </p>
              </div>
            </div>
            {i < transactionsQuery.data!.content.length - 1 && (
              <div style={{ height: 1, background: COLORS.border }} />
            )}
          </div>
        ))}

        {transactionsQuery.data && (transactionsQuery.data.totalPages > 1) && (
          <div className="flex gap-2 mt-4">
            <button
              onClick={() => setPage((p) => p - 1)}
              disabled={transactionsQuery.data.first}
              className="flex-1 py-2 rounded-lg text-xs disabled:opacity-40"
              style={{ border: `1px solid ${COLORS.border}`, color: COLORS.text }}
            >
              이전
            </button>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={transactionsQuery.data.last}
              className="flex-1 py-2 rounded-lg text-xs disabled:opacity-40"
              style={{ border: `1px solid ${COLORS.border}`, color: COLORS.text }}
            >
              다음
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
