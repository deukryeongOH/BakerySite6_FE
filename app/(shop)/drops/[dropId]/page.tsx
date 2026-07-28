"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { BackHeader } from "@/components/back-header";
import { COLORS } from "@/lib/theme";
import * as dropApi from "@/lib/api/drop";
import { ApiException } from "@/lib/api/types";
import { DropDetailView } from "./drop-detail-view";

export default function DropDetailPage() {
  const params = useParams<{ dropId: string }>();
  const dropId = Number(params.dropId);
  const dropIdValid = Number.isFinite(dropId) && dropId > 0;

  const dropQuery = useQuery({
    queryKey: ["drop-info", dropId],
    queryFn: () => dropApi.getDropInfo(dropId),
    enabled: dropIdValid,
  });

  if (dropIdValid && dropQuery.data) {
    return <DropDetailView dropId={dropId} drop={dropQuery.data} />;
  }

  return (
    <div className="flex flex-col flex-1" style={{ background: COLORS.bg }}>
      <BackHeader title="드롭 상세" href="/" />
      <div className="flex-1 flex items-center justify-center">
        <p className="text-sm" style={{ color: COLORS.muted }}>
          {!dropIdValid
            ? "잘못된 접근입니다."
            : dropQuery.isError
              ? dropQuery.error instanceof ApiException
                ? dropQuery.error.message
                : "드롭 정보를 불러오지 못했습니다."
              : "불러오는 중..."}
        </p>
      </div>
    </div>
  );
}
