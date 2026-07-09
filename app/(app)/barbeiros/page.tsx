import { hasPermission } from "@/lib/auth/rbac";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { ComingSoon } from "@/components/shared/coming-soon";
import { listBarbersAction } from "@/modules/barbers/actions/list-barbers.action";
import { getBarberFormOptionsAction } from "@/modules/barbers/actions/get-barber-form-options.action";
import { BarberFilters } from "@/modules/barbers/components/barber-filters";
import { BarberList } from "@/modules/barbers/components/barber-list";
import { NewBarberButton } from "@/modules/barbers/components/new-barber-button";
import type { BarberStatus } from "@/modules/barbers/types/barber.types";

export default async function BarbeirosPage({
  searchParams,
}: {
  searchParams: { search?: string; status?: string };
}) {
  const canView = await hasPermission(PERMISSIONS.barbers.view);
  if (!canView) return <ComingSoon title="Barbeiros" />;

  const [canCreate, canUpdate, canDelete] = await Promise.all([
    hasPermission(PERMISSIONS.barbers.create),
    hasPermission(PERMISSIONS.barbers.update),
    hasPermission(PERMISSIONS.barbers.delete),
  ]);

  const search = searchParams.search || "";
  const status = searchParams.status || "";

  const [options, barbers] = await Promise.all([
    getBarberFormOptionsAction(),
    listBarbersAction({ search: search || undefined, status: (status || undefined) as BarberStatus | undefined }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-text">Barbeiros</h1>
          <p className="text-sm text-text-secondary">Cadastro, horários e serviços de cada barbeiro.</p>
        </div>
        {canCreate && <NewBarberButton options={options} />}
      </div>

      <BarberFilters search={search} status={status} />

      <BarberList barbers={barbers} options={options} canUpdate={canUpdate} canDelete={canDelete} />
    </div>
  );
}
