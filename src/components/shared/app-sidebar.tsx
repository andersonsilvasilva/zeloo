"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  CalendarDays,
  Users,
  Scissors,
  Sparkles,
  Wallet,
  BarChart3,
  MessageCircle,
  ShieldCheck,
  Settings,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { NavItem } from "@/components/shared/nav-items";

const ICONS: Record<string, LucideIcon> = {
  LayoutDashboard,
  CalendarDays,
  Users,
  Scissors,
  Sparkles,
  Wallet,
  BarChart3,
  MessageCircle,
  ShieldCheck,
  Settings,
};

export interface AppSidebarProps {
  navItems: NavItem[];
  open: boolean;
  onNavigate: () => void;
  logoUrl: string | null;
}

export function AppSidebar({ navItems, open, onNavigate, logoUrl }: AppSidebarProps) {
  const pathname = usePathname();

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/60 md:hidden"
          onClick={onNavigate}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-64 shrink-0 border-r border-border bg-card transition-transform md:sticky md:top-0 md:h-screen md:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-center justify-center border-b border-border p-4">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoUrl}
              alt="Logomarca da barbearia"
              className="h-[100px] w-[100px] rounded-lg object-contain"
            />
          ) : (
            <div className="flex h-[100px] w-[100px] items-center justify-center rounded-lg border border-dashed border-border text-text-secondary">
              <Scissors size={32} />
            </div>
          )}
        </div>

        <nav className="flex flex-col gap-1 p-3">
          {navItems.map((item) => {
            const Icon = ICONS[item.icon];
            const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors focus-gold",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-text-secondary hover:bg-background-secondary hover:text-text",
                )}
              >
                {Icon && <Icon size={18} />}
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
