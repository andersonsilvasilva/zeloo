import Link from "next/link";
import { format } from "date-fns";
import { ArrowLeft } from "lucide-react";
import { hasPermission } from "@/lib/auth/rbac";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { ComingSoon } from "@/components/shared/coming-soon";
import { PrintButton } from "@/components/shared/print-button";
import { PrintHeader } from "@/components/shared/print-header";
import { getGeneralSettingsAction } from "@/modules/settings/actions/get-general-settings.action";
import { getMonthlyClosingReportAction } from "@/modules/accounts/actions/get-monthly-closing-report.action";
import { MonthlyClosingReportTable } from "@/modules/accounts/components/monthly-closing-report-table";
import { MonthFilter } from "@/modules/accounts/components/month-filter";
import { formatCurrency } from "@/lib/utils/format";
import { formatDateOnly } from "@/lib/utils/date-only";

export default async function FechamentoMensalPage({ searchParams }: { searchParams: { month?: string } }) {
  const [canViewPayables, canViewReceivables] = await Promise.all([
    hasPermission(PERMISSIONS.payables.view),
    hasPermission(PERMISSIONS.receivables.view),
  ]);
  if (!canViewPayables || !canViewReceivables) return <ComingSoon title="Fechamento mensal" />;

  const monthParam = searchParams.month || format(new Date(), "yyyy-MM");
  const [year, month] = monthParam.split("-").map(Number);
  // Date.UTC — month é @db.Date por baixo (comparado contra dueDate), evita
  // deslocar pro mês/dia errado em fusos != UTC.
  const monthDate = new Date(Date.UTC(year, month - 1, 1));

  const [report, settings] = await Promise.all([
    getMonthlyClosingReportAction({ month: monthDate }),
    getGeneralSettingsAction(),
  ]);

  const [labelYear, labelMonth] = formatDateOnly(monthDate).split("-");
  const periodLabel = `Mês: ${labelMonth}/${labelYear}`;

  return (
    <div className="space-y-6">
      <PrintHeader
        logoUrl={settings.logoUrl}
        businessName={settings.name}
        title="Fechamento mensal — Contas a Pagar e Receber"
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
          <h1 className="text-2xl font-semibold text-text">Fechamento mensal</h1>
          <p className="text-sm text-text-secondary">
            Consolidado de contas a pagar e a receber do mês, por categoria. Só leitura — não trava lançamentos.
          </p>
        </div>
        <PrintButton label="Imprimir fechamento" />
      </div>

      <MonthFilter month={monthParam} />

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-sm text-text-secondary">Total a pagar no mês (por vencimento)</p>
          <p className="mt-1 text-2xl font-semibold text-danger">{formatCurrency(report.totalPayable)}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-sm text-text-secondary">Total a receber no mês (por vencimento)</p>
          <p className="mt-1 text-2xl font-semibold text-success">{formatCurrency(report.totalReceivable)}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-sm text-text-secondary">Saldo já liquidado no mês</p>
          <p className={`mt-1 text-2xl font-semibold ${report.balance >= 0 ? "text-success" : "text-danger"}`}>
            {formatCurrency(report.balance)}
          </p>
          <p className="mt-1 text-xs text-text-secondary">
            Recebido: {formatCurrency(report.totalReceivableSettled)} · Pago: {formatCurrency(report.totalPayableSettled)}
          </p>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="mb-4 text-sm font-medium text-text">Por categoria (vencimento no mês)</h2>
        <MonthlyClosingReportTable data={report} />
      </section>
    </div>
  );
}
