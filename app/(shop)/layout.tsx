"use client";

import { usePathname } from "next/navigation";
import { TabBar } from "@/components/tab-bar";

const TAB_ROUTES = new Set(["/", "/wishlist", "/orders", "/mypage"]);

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const showTabBar = TAB_ROUTES.has(pathname);

  return (
    <>
      <div className="flex-1 min-h-0 overflow-y-auto flex flex-col">{children}</div>
      {showTabBar && <TabBar activeHref={pathname} />}
    </>
  );
}
