"use client";

import { ChevronLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { COLORS } from "@/lib/theme";

export function BackHeader({ title, href }: { title: string; href?: string }) {
  const router = useRouter();
  return (
    <div
      className="flex items-center gap-3 px-4 pt-12 pb-4 flex-shrink-0 border-b"
      style={{ borderColor: COLORS.border }}
    >
      <button
        onClick={() => (href ? router.push(href) : router.back())}
        aria-label="뒤로가기"
      >
        <ChevronLeft size={24} color={COLORS.text} />
      </button>
      <span className="text-[15px] font-semibold" style={{ color: COLORS.text }}>
        {title}
      </span>
    </div>
  );
}
