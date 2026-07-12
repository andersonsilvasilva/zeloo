import { hasPermission } from "@/lib/auth/rbac";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { ComingSoon } from "@/components/shared/coming-soon";
import { listProfessionalsAction } from "@/modules/professionals/actions/list-professionals.action";
import { getProfessionalFormOptionsAction } from "@/modules/professionals/actions/get-professional-form-options.action";
import { ProfessionalFilters } from "@/modules/professionals/components/professional-filters";
import { ProfessionalList } from "@/modules/professionals/components/professional-list";
import { NewProfessionalButton } from "@/modules/professionals/components/new-professional-button";
import type { ProfessionalStatus } from "@/modules/professionals/types/professional.types";

export default async function ProfissionaisPage({
  searchParams,
}: {
  searchParams: { search?: string; status?: string };
}) {
  const canView = await hasPermission(PERMISSIONS.professionals.view);
  if (!canView) return <ComingSoon title="Profissionais" />;

  const [canCreate, canUpdate, canDelete] = await Promise.all([
    hasPermission(PERMISSIONS.professionals.create),
    hasPermission(PERMISSIONS.professionals.update),
    hasPermission(PERMISSIONS.professionals.delete),
  ]);

  const search = searchParams.search || "";
  const status = searchParams.status || "";

  const [options, professionals] = await Promise.all([
    getProfessionalFormOptionsAction(),
    listProfessionalsAction({ search: search || undefined, status: (status || undefined) as ProfessionalStatus | undefined }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-text">Profissionais</h1>
          <p className="text-sm text-text-secondary">Cadastro, horários e serviços de cada profissional.</p>
        </div>
        {canCreate && <NewProfessionalButton options={options} />}
      </div>

      <ProfessionalFilters search={search} status={status} />

      <ProfessionalList professionals={professionals} options={options} canUpdate={canUpdate} canDelete={canDelete} />
    </div>
  );
}
