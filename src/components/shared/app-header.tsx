"use client";

import { Menu, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { logoutAction } from "@/modules/auth/actions/logout.action";

export interface AppHeaderProps {
  userName: string;
  userEmail: string;
  onMenuClick: () => void;
  logoUrl: string | null;
}

export function AppHeader({ userName, userEmail, onMenuClick, logoUrl }: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-border bg-card px-4 print:hidden md:px-6">
      <div className="flex items-center gap-2 md:hidden">
        <button
          type="button"
          onClick={onMenuClick}
          className="rounded-lg p-2 text-text hover:bg-background-secondary focus-gold"
          aria-label="Abrir menu"
        >
          <Menu size={20} />
        </button>
        {logoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl} alt="Logomarca da barbearia" className="h-8 w-8 rounded object-contain" />
        )}
      </div>

      <div className="hidden md:block" />

      <div className="flex items-center gap-4">
        <div className="text-right">
          <p className="text-sm font-medium text-text">{userName}</p>
          <p className="text-xs text-text-secondary">{userEmail}</p>
        </div>
        <form action={logoutAction}>
          <Button type="submit" variant="ghost" size="sm">
            <LogOut size={16} />
            Sair
          </Button>
        </form>
      </div>
    </header>
  );
}
