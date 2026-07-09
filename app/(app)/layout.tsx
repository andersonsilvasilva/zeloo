import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth";
import { getSessionPermissions } from "@/lib/auth/rbac";
import { AppShell } from "@/components/shared/app-shell";
import { NAV_ITEMS } from "@/components/shared/nav-items";
import { getGeneralSettingsAction } from "@/modules/settings/actions/get-general-settings.action";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const [permissions, settings] = await Promise.all([getSessionPermissions(), getGeneralSettingsAction()]);
  const navItems = NAV_ITEMS.filter((item) => !item.permission || permissions.has(item.permission));

  return (
    <AppShell
      navItems={navItems}
      userName={session.user.name ?? "Usuário"}
      userEmail={session.user.email ?? ""}
      logoUrl={settings.logoUrl}
    >
      {children}
    </AppShell>
  );
}
