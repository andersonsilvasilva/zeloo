import { formatCurrency } from "@/lib/utils/format";
import type { PaymentMethodTotal } from "@/modules/reports/types/period-report.types";

export function PaymentMethodList({ data }: { data: PaymentMethodTotal[] }) {
  if (data.length === 0) {
    return <p className="text-sm text-text-secondary">Sem pagamentos registrados no período.</p>;
  }

  return (
    <div className="space-y-2">
      {data.map((entry) => (
        <div key={entry.method} className="flex items-center justify-between text-sm">
          <span className="text-text-secondary">{entry.method}</span>
          <span className="font-medium text-text">{formatCurrency(entry.total)}</span>
        </div>
      ))}
    </div>
  );
}
