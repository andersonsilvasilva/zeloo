import { formatCurrency } from "@/lib/utils/format";
import type { AccountEntrySummary } from "@/modules/accounts/types/account.types";

/** Totais pendente/vencido/liquidado — funciona como o "relatório embutido" de cada tela (Pagar/Receber). */
export function AccountSummaryCards({ summary }: { summary: AccountEntrySummary }) {
  return (
    <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <div className="rounded-xl border border-border bg-card p-5">
        <p className="text-sm text-text-secondary">Pendente</p>
        <p className="mt-1 text-2xl font-semibold text-warning">{formatCurrency(summary.totalPending)}</p>
      </div>
      <div className="rounded-xl border border-border bg-card p-5">
        <p className="text-sm text-text-secondary">Vencido</p>
        <p className="mt-1 text-2xl font-semibold text-danger">{formatCurrency(summary.totalOverdue)}</p>
      </div>
      <div className="rounded-xl border border-border bg-card p-5">
        <p className="text-sm text-text-secondary">{summary.direction === "RECEIVABLE" ? "Recebido" : "Pago"}</p>
        <p className="mt-1 text-2xl font-semibold text-success">{formatCurrency(summary.totalSettled)}</p>
      </div>
    </section>
  );
}
