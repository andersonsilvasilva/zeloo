import { format } from "date-fns";
import { formatCurrency } from "@/lib/utils/format";
import { CashbookEntryTypeBadge } from "@/modules/finance/components/cashbook-entry-type-badge";
import type { CashbookEntryItem } from "@/modules/finance/types/finance.types";

export function CashbookList({ entries }: { entries: CashbookEntryItem[] }) {
  if (entries.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-text-secondary">
        Nenhum lançamento encontrado para o filtro selecionado.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {entries.map((entry) => (
        <div key={entry.id} className="rounded-xl border border-border bg-card p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <CashbookEntryTypeBadge type={entry.type} />
              <span className="font-medium text-text">{entry.description}</span>
            </div>
            <span className={entry.type === "CREDIT" ? "font-medium text-success" : "font-medium text-danger"}>
              {entry.type === "CREDIT" ? "+" : "-"}
              {formatCurrency(entry.amount)}
            </span>
          </div>
          <p className="mt-1 text-xs text-text-secondary">
            {format(entry.transactionDate, "dd/MM/yyyy HH:mm")}
            {entry.category ? ` · ${entry.category}` : ""}
            {entry.createdBy ? ` · Lançado por ${entry.createdBy.name}` : ""}
          </p>
          {entry.notes && <p className="mt-1 text-xs text-text-secondary">Obs: {entry.notes}</p>}
        </div>
      ))}
    </div>
  );
}
