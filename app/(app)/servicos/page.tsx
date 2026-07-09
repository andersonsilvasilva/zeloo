import { hasPermission } from "@/lib/auth/rbac";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { ComingSoon } from "@/components/shared/coming-soon";
import { listServicesAction } from "@/modules/services/actions/list-services.action";
import { getServiceFormOptionsAction } from "@/modules/services/actions/get-service-form-options.action";
import { ServiceFilters } from "@/modules/services/components/service-filters";
import { ServiceList } from "@/modules/services/components/service-list";
import { NewServiceButton } from "@/modules/services/components/new-service-button";
import type { ServiceStatus } from "@/modules/services/types/service.types";

export default async function ServicosPage({
  searchParams,
}: {
  searchParams: { search?: string; status?: string };
}) {
  const canView = await hasPermission(PERMISSIONS.services.view);
  if (!canView) return <ComingSoon title="Serviços" />;

  const [canCreate, canUpdate, canDelete] = await Promise.all([
    hasPermission(PERMISSIONS.services.create),
    hasPermission(PERMISSIONS.services.update),
    hasPermission(PERMISSIONS.services.delete),
  ]);

  const search = searchParams.search || "";
  const status = searchParams.status || "";

  const [services, options] = await Promise.all([
    listServicesAction({
      search: search || undefined,
      status: (status || undefined) as ServiceStatus | undefined,
    }),
    getServiceFormOptionsAction(),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-text">Serviços</h1>
          <p className="text-sm text-text-secondary">Catálogo de serviços oferecidos pela barbearia.</p>
        </div>
        {canCreate && <NewServiceButton options={options} />}
      </div>

      <ServiceFilters search={search} status={status} />

      <ServiceList services={services} options={options} canUpdate={canUpdate} canDelete={canDelete} />
    </div>
  );
}
