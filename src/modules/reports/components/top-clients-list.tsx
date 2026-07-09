import { formatCurrency } from "@/lib/utils/format";
import type { NamedTotal } from "@/modules/reports/types/dashboard.types";

export function TopClientsList({ data }: { data: NamedTotal[] }) {
  if (data.length === 0) {
    return <p className="text-sm text-text-secondary">Sem clientes com pagamentos no período.</p>;
  }

  return (
    <div className="space-y-2">
      {data.map((entry, index) => (
        <div key={entry.name + index} className="flex items-center justify-between text-sm">
          <span className="text-text-secondary">
            {index + 1}. {entry.name}
          </span>
          <span className="font-medium text-text">{formatCurrency(entry.total)}</span>
        </div>
      ))}
    </div>
  );
}
