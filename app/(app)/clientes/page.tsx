import { hasPermission } from "@/lib/auth/rbac";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { ComingSoon } from "@/components/shared/coming-soon";
import { listClientsAction } from "@/modules/clients/actions/list-clients.action";
import { getClientFormOptionsAction } from "@/modules/clients/actions/get-client-form-options.action";
import { ClientFilters } from "@/modules/clients/components/client-filters";
import { ClientList } from "@/modules/clients/components/client-list";
import { NewClientButton } from "@/modules/clients/components/new-client-button";
import type { ClientStatus } from "@/modules/clients/types/client.types";

export default async function ClientesPage({
  searchParams,
}: {
  searchParams: { search?: string; status?: string; professionalId?: string };
}) {
  const canView = await hasPermission(PERMISSIONS.clients.view);
  if (!canView) return <ComingSoon title="Clientes" />;

  const [canCreate, canUpdate, canDelete] = await Promise.all([
    hasPermission(PERMISSIONS.clients.create),
    hasPermission(PERMISSIONS.clients.update),
    hasPermission(PERMISSIONS.clients.delete),
  ]);

  const search = searchParams.search || "";
  const status = searchParams.status || "";
  const professionalId = searchParams.professionalId || "";

  const [options, clients] = await Promise.all([
    getClientFormOptionsAction(),
    listClientsAction({
      search: search || undefined,
      status: (status || undefined) as ClientStatus | undefined,
      preferredProfessionalId: professionalId || undefined,
    }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-text">Clientes</h1>
          <p className="text-sm text-text-secondary">Cadastro e histórico de clientes da barbearia.</p>
        </div>
        {canCreate && <NewClientButton options={options} />}
      </div>

      <ClientFilters search={search} status={status} preferredProfessionalId={professionalId} professionals={options.professionals} />

      <ClientList clients={clients} options={options} canUpdate={canUpdate} canDelete={canDelete} />
    </div>
  );
}
