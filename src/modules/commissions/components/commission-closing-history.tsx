import { format } from "date-fns";
import { formatCurrency } from "@/lib/utils/format";
import { formatDateOnlyBR } from "@/lib/utils/date-only";
import type { CommissionClosingItem } from "@/modules/commissions/types/commission.types";

export function CommissionClosingHistory({ closings }: { closings: CommissionClosingItem[] }) {
  if (closings.length === 0) {
    return <p className="text-sm text-text-secondary">Nenhum fechamento registrado ainda.</p>;
  }

  return (
    <div className="space-y-3">
      {closings.map((closing) => (
        <div key={closing.id} className="rounded-xl border border-border bg-card p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-medium text-text">{closing.professionalName}</span>
            <span className="font-medium text-text">{formatCurrency(closing.finalAmount)}</span>
          </div>
          <p className="mt-1 text-xs text-text-secondary">
            Período: {formatDateOnlyBR(closing.periodStart)} a {formatDateOnlyBR(closing.periodEnd)} · Fechado em{" "}
            {format(closing.closedAt, "dd/MM/yyyy HH:mm")}
            {closing.closedByName ? ` por ${closing.closedByName}` : ""}
          </p>
          {closing.finalAmount !== closing.calculatedAmount && (
            <p className="mt-1 text-xs text-text-secondary">
              Valor calculado automaticamente: {formatCurrency(closing.calculatedAmount)}
              {closing.adjustmentNotes ? ` — ${closing.adjustmentNotes}` : ""}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
