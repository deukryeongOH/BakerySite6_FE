import Link from "next/link";
import { Bookmark, Home, ShoppingBag, User } from "lucide-react";
import { COLORS } from "@/lib/theme";

const TABS = [
  { href: "/", label: "홈", icon: Home },
  { href: "/wishlist", label: "찜", icon: Bookmark },
  { href: "/orders", label: "주문내역", icon: ShoppingBag },
  { href: "/mypage", label: "마이", icon: User },
] as const;

export function TabBar({ activeHref }: { activeHref: string }) {
  return (
    <div
      className="flex flex-shrink-0 border-t"
      style={{ background: COLORS.surface, borderColor: COLORS.border }}
    >
      {TABS.map(({ href, label, icon: Icon }) => {
        const active = href === activeHref;
        return (
          <Link
            key={href}
            href={href}
            className="flex-1 flex flex-col items-center gap-0.5 py-3"
            style={{ color: active ? COLORS.accent : COLORS.muted }}
          >
            <Icon size={20} />
            <span className="text-[11px]">{label}</span>
          </Link>
        );
      })}
    </div>
  );
}
