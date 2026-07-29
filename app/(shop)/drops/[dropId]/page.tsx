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
    // dropStatus(UPCOMING/ACTIVE/COMPLETED)는 서버에서 계산되는 값이라, 오픈/마감 시각이
    // 지나도 클라이언트가 다시 조회하기 전까진 화면이 그 시점 상태에 멈춰 있는다
    // (배포 환경에서 오픈 시간이 됐는데도 카운트다운만 00:00:00에 멈추고 안 열리는 버그).
    refetchInterval: (query) => (query.state.data?.dropStatus === "COMPLETED" ? false : 3000),
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
