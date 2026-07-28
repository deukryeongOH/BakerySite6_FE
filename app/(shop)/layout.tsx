"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { TabBar } from "@/components/tab-bar";
import { useAuth } from "@/lib/auth/auth-context";

const TAB_ROUTES = new Set(["/", "/wishlist", "/orders", "/mypage"]);

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();
  const showTabBar = TAB_ROUTES.has(pathname);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading || !isAuthenticated) return null;

  return (
    <>
      <div className="flex-1 min-h-0 overflow-y-auto flex flex-col">{children}</div>
      {showTabBar && <TabBar activeHref={pathname} />}
    </>
  );
}
