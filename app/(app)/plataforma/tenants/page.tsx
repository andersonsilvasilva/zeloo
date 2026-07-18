import { hasPermission } from "@/lib/auth/rbac";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { requireRootTenant } from "@/lib/tenancy/current-tenant";
import { ComingSoon } from "@/components/shared/coming-soon";
import { listTenantsAction } from "@/modules/tenancy/actions/list-tenants.action";
import { TenantList } from "@/modules/tenancy/components/tenant-list";
import { NewTenantButton } from "@/modules/tenancy/components/new-tenant-button";

/**
 * Tela de plataforma (cadastro de negócios/tenants novos) — só existe pro
 * tenant raiz (`ROOT_TENANT_SLUG`, hoje "zeloo"). Qualquer outro tenant
 * recebe 404 antes mesmo de chegar aqui (ver requireRootTenant()) — não
 * existe papel "platform admin" separado de "tenant admin" ainda, então a
 * barreira real é essa, não só a permissão (ver PERMISSIONS.platform).
 */
export default async function PlataformaTenantsPage() {
  await requireRootTenant();

  const canManage = await hasPermission(PERMISSIONS.platform.manageTenants);
  if (!canManage) return <ComingSoon title="Tenants" />;

  const baseDomain = process.env.APP_BASE_DOMAIN || "zeloo.net";
  const tenants = await listTenantsAction();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-text">Tenants</h1>
          <p className="text-sm text-text-secondary">Negócios cadastrados na plataforma.</p>
        </div>
        <NewTenantButton baseDomain={baseDomain} />
      </div>

      <TenantList tenants={tenants} baseDomain={baseDomain} />
    </div>
  );
}
