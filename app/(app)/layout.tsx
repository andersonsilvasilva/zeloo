import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth";
import { getSessionPermissions } from "@/lib/auth/rbac";
import { requireCurrentTenant } from "@/lib/tenancy/current-tenant";
import { AppShell } from "@/components/shared/app-shell";
import { NAV_ITEMS } from "@/components/shared/nav-items";
import { getGeneralSettingsAction } from "@/modules/settings/actions/get-general-settings.action";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  // 404 se o hostname não resolve tenant nenhum; redireciona pra
  // /tenant-indisponivel se suspenso/cancelado (Fase 2 — spec §18).
  const currentTenant = await requireCurrentTenant();

  // Fase 5, spec §32: tenant_id do token precisa bater com o tenant
  // resolvido pelo hostname atual — sessão emitida num subdomínio nunca
  // vale noutro, mesmo que o cookie chegasse até lá (defesa em profundidade;
  // o escopo padrão do cookie por host já evita isso na prática, ver
  // docs/tenancy/03-auth-sessions.md §3).
  if (currentTenant.id !== session.user.tenantId) {
    redirect("/login");
  }

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
