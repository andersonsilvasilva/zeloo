import { format } from "date-fns";
import { hasPermission } from "@/lib/auth/rbac";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { ComingSoon } from "@/components/shared/coming-soon";
import { PrintButton } from "@/components/shared/print-button";
import { PrintHeader } from "@/components/shared/print-header";
import { getGeneralSettingsAction } from "@/modules/settings/actions/get-general-settings.action";
import { getPeriodReportAction } from "@/modules/reports/actions/get-period-report.action";
import { StatCard } from "@/modules/reports/components/stat-card";
import { RevenueLineChart } from "@/modules/reports/components/revenue-line-chart";
import { ServicePieChart } from "@/modules/reports/components/service-pie-chart";
import { BarberBarChart } from "@/modules/reports/components/barber-bar-chart";
import { DateRangeFilters } from "@/components/shared/date-range-filters";
import { AppointmentStatusSummary } from "@/modules/reports/components/appointment-status-summary";
import { PaymentMethodList } from "@/modules/reports/components/payment-method-list";
import { TopClientsList } from "@/modules/reports/components/top-clients-list";
import { BarberPerformanceTable } from "@/modules/reports/components/barber-performance-table";
import { formatCurrency, formatCompactNumber } from "@/lib/utils/format";

function parseLocalDate(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export default async function RelatoriosPage({
  searchParams,
}: {
  searchParams: { dateFrom?: string; dateTo?: string };
}) {
  const canView = await hasPermission(PERMISSIONS.reports.view);
  if (!canView) return <ComingSoon title="Relatórios" />;

  const today = format(new Date(), "yyyy-MM-dd");
  const thirtyDaysAgo = format(new Date(Date.now() - 29 * 24 * 60 * 60 * 1000), "yyyy-MM-dd");
  const dateFrom = searchParams.dateFrom || thirtyDaysAgo;
  const dateTo = searchParams.dateTo || today;

  const [report, settings] = await Promise.all([
    getPeriodReportAction({
      dateFrom: parseLocalDate(dateFrom),
      dateTo: parseLocalDate(dateTo),
    }),
    getGeneralSettingsAction(),
  ]);

  const periodLabel = `Período: ${format(parseLocalDate(dateFrom), "dd/MM/yyyy")} a ${format(parseLocalDate(dateTo), "dd/MM/yyyy")}`;

  return (
    <div className="space-y-8">
      <PrintHeader
        logoUrl={settings.logoUrl}
        businessName={settings.name}
        title="Relatório de desempenho"
        subtitle={periodLabel}
      />

      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div>
          <h1 className="text-2xl font-semibold text-text">Relatórios</h1>
          <p className="text-sm text-text-secondary">
            {report.scopedToOwnBarber
              ? "Mostrando apenas os seus próprios indicadores."
              : "Indicadores detalhados por período customizável."}
          </p>
        </div>
        <PrintButton />
      </div>

      <DateRangeFilters dateFrom={dateFrom} dateTo={dateTo} />

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Faturamento no período" value={formatCurrency(report.totalRevenue)} />
        <StatCard label="Atendimentos concluídos" value={formatCompactNumber(report.appointmentsCompleted)} />
        <StatCard label="Ticket médio" value={formatCurrency(report.averageTicket)} />
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium uppercase tracking-wide text-text-secondary">Agendamentos por status</h2>
        <div className="rounded-xl border border-border bg-card p-5">
          <AppointmentStatusSummary data={report.appointmentsByStatus} />
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-5 xl:col-span-2">
          <h2 className="mb-4 text-sm font-medium text-text">Evolução de faturamento no período</h2>
          <RevenueLineChart data={report.revenueTrend} />
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="mb-4 text-sm font-medium text-text">Distribuição de serviços</h2>
          <ServicePieChart data={report.serviceDistribution} />
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="mb-4 text-sm font-medium text-text">Faturamento por barbeiro</h2>
          <BarberBarChart data={report.barberPerformance.map((b) => ({ name: b.name, total: b.revenue }))} />
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {!report.scopedToOwnBarber && (
          <div className="rounded-xl border border-border bg-card p-5">
            <h2 className="mb-4 text-sm font-medium text-text">Faturamento por forma de pagamento</h2>
            <PaymentMethodList data={report.revenueByPaymentMethod} />
          </div>
        )}

        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="mb-4 text-sm font-medium text-text">Clientes que mais gastaram</h2>
          <TopClientsList data={report.topClients} />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium uppercase tracking-wide text-text-secondary">Desempenho por barbeiro</h2>
        <div className="rounded-xl border border-border bg-card p-5">
          <BarberPerformanceTable data={report.barberPerformance} />
        </div>
      </section>
    </div>
  );
}
