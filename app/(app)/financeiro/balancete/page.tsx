import Link from "next/link";
import { format, startOfMonth } from "date-fns";
import { ArrowLeft } from "lucide-react";
import { hasPermission } from "@/lib/auth/rbac";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { ComingSoon } from "@/components/shared/coming-soon";
import { DateRangeFilters } from "@/components/shared/date-range-filters";
import { PrintButton } from "@/components/shared/print-button";
import { PrintHeader } from "@/components/shared/print-header";
import { getGeneralSettingsAction } from "@/modules/settings/actions/get-general-settings.action";
import { getBalanceteAction } from "@/modules/finance/actions/get-balancete.action";
import { BalanceteTable } from "@/modules/finance/components/balancete-table";
import { formatCurrency } from "@/lib/utils/format";

function parseLocalDate(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export default async function BalancetePage({
  searchParams,
}: {
  searchParams: { dateFrom?: string; dateTo?: string };
}) {
  const canView = await hasPermission(PERMISSIONS.finance.view);
  if (!canView) return <ComingSoon title="Balancete" />;

  const today = format(new Date(), "yyyy-MM-dd");
  const monthStart = format(startOfMonth(new Date()), "yyyy-MM-dd");
  const dateFrom = searchParams.dateFrom || monthStart;
  const dateTo = searchParams.dateTo || today;

  const [balancete, settings] = await Promise.all([
    getBalanceteAction({ dateFrom: parseLocalDate(dateFrom), dateTo: parseLocalDate(dateTo) }),
    getGeneralSettingsAction(),
  ]);

  const periodLabel = `Período: ${format(parseLocalDate(dateFrom), "dd/MM/yyyy")} a ${format(parseLocalDate(dateTo), "dd/MM/yyyy")}`;

  return (
    <div className="space-y-6">
      <PrintHeader
        logoUrl={settings.logoUrl}
        businessName={settings.name}
        title="Balancete débito/crédito"
        subtitle={periodLabel}
      />

      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div>
          <Link
            href="/financeiro"
            className="mb-1 inline-flex items-center gap-1 text-sm text-text-secondary hover:text-text"
          >
            <ArrowLeft size={14} />
            Voltar ao financeiro
          </Link>
          <h1 className="text-2xl font-semibold text-text">Balancete débito/crédito</h1>
          <p className="text-sm text-text-secondary">Resumo de entradas e saídas por categoria no período.</p>
        </div>
        <PrintButton label="Imprimir balancete" />
      </div>

      <DateRangeFilters dateFrom={dateFrom} dateTo={dateTo} />

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-sm text-text-secondary">Total de créditos</p>
          <p className="mt-1 text-2xl font-semibold text-success">{formatCurrency(balancete.totalCredit)}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-sm text-text-secondary">Total de débitos</p>
          <p className="mt-1 text-2xl font-semibold text-danger">{formatCurrency(balancete.totalDebit)}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-sm text-text-secondary">Saldo do período</p>
          <p
            className={`mt-1 text-2xl font-semibold ${balancete.totalBalance >= 0 ? "text-success" : "text-danger"}`}
          >
            {formatCurrency(balancete.totalBalance)}
          </p>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="mb-4 text-sm font-medium text-text">Por categoria</h2>
        <BalanceteTable data={balancete} />
      </section>
    </div>
  );
}
