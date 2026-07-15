import { format, startOfMonth } from "date-fns";
import { hasPermission } from "@/lib/auth/rbac";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { ComingSoon } from "@/components/shared/coming-soon";
import { DateRangeFilters } from "@/components/shared/date-range-filters";
import { listPendingCommissionsAction } from "@/modules/commissions/actions/list-pending-commissions.action";
import { listCommissionClosingsAction } from "@/modules/commissions/actions/list-commission-closings.action";
import { CommissionPendingList } from "@/modules/commissions/components/commission-pending-list";
import { CommissionClosingHistory } from "@/modules/commissions/components/commission-closing-history";
import { parseDateOnly } from "@/lib/utils/date-only";

export default async function ComissoesPage({
  searchParams,
}: {
  searchParams: { dateFrom?: string; dateTo?: string };
}) {
  const canView = await hasPermission(PERMISSIONS.commissions.view);
  if (!canView) return <ComingSoon title="Comissões" />;

  const canClose = await hasPermission(PERMISSIONS.commissions.close);

  const today = format(new Date(), "yyyy-MM-dd");
  const monthStart = format(startOfMonth(new Date()), "yyyy-MM-dd");
  const dateFrom = searchParams.dateFrom || monthStart;
  const dateTo = searchParams.dateTo || today;

  const [pending, closings] = await Promise.all([
    listPendingCommissionsAction({ periodStart: parseDateOnly(dateFrom), periodEnd: parseDateOnly(dateTo) }),
    listCommissionClosingsAction(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-text">Comissões</h1>
        <p className="text-sm text-text-secondary">
          {canClose
            ? "Cálculo automático por período, com ajuste manual antes de fechar."
            : "Sua comissão calculada no período selecionado."}
        </p>
      </div>

      <DateRangeFilters dateFrom={dateFrom} dateTo={dateTo} />

      <section className="space-y-3">
        <h2 className="text-sm font-medium uppercase tracking-wide text-text-secondary">Período selecionado</h2>
        <CommissionPendingList rows={pending} periodStart={dateFrom} periodEnd={dateTo} canClose={canClose} />
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium uppercase tracking-wide text-text-secondary">Histórico de fechamentos</h2>
        <CommissionClosingHistory closings={closings} />
      </section>
    </div>
  );
}
