import { formatCurrency } from "@/lib/utils/format";
import type { BarberPerformanceRow } from "@/modules/reports/types/period-report.types";

export function BarberPerformanceTable({ data }: { data: BarberPerformanceRow[] }) {
  if (data.length === 0) {
    return <p className="text-sm text-text-secondary">Sem atendimentos concluídos no período.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-text-secondary">
            <th className="py-2 pr-4 font-medium">Barbeiro</th>
            <th className="py-2 pr-4 font-medium">Atendimentos</th>
            <th className="py-2 pr-4 font-medium">Faturamento</th>
            <th className="py-2 pr-4 font-medium">Comissão</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr key={row.id} className="border-b border-border/50 last:border-0">
              <td className="py-2 pr-4 text-text">{row.name}</td>
              <td className="py-2 pr-4 text-text-secondary">{row.count}</td>
              <td className="py-2 pr-4 text-text-secondary">{formatCurrency(row.revenue)}</td>
              <td className="py-2 pr-4 text-text-secondary">
                {formatCurrency(row.commission)}{" "}
                <span className="text-xs">({row.commissionPercentage}%)</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
