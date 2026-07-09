"use client";

import { useState, type ReactNode } from "react";
import { AppSidebar } from "@/components/shared/app-sidebar";
import { AppHeader } from "@/components/shared/app-header";
import { AppFooter } from "@/components/shared/app-footer";
import type { NavItem } from "@/components/shared/nav-items";

export interface AppShellProps {
  navItems: NavItem[];
  userName: string;
  userEmail: string;
  logoUrl: string | null;
  children: ReactNode;
}

export function AppShell({ navItems, userName, userEmail, logoUrl, children }: AppShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-background md:flex-row">
      <AppSidebar
        navItems={navItems}
        open={mobileOpen}
        onNavigate={() => setMobileOpen(false)}
        logoUrl={logoUrl}
      />

      <div className="flex min-h-screen flex-1 flex-col">
        <AppHeader
          userName={userName}
          userEmail={userEmail}
          onMenuClick={() => setMobileOpen(true)}
          logoUrl={logoUrl}
        />
        <main className="flex-1 px-4 py-6 md:px-6">{children}</main>
        <AppFooter />
      </div>
    </div>
  );
}
