import { formatCurrency } from "@/lib/utils/format";
import type { MonthlyClosingReport } from "@/modules/accounts/types/account.types";

export function MonthlyClosingReportTable({ data }: { data: MonthlyClosingReport }) {
  if (data.rows.length === 0) {
    return <p className="text-sm text-text-secondary">Nenhuma conta com vencimento neste mês.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-text-secondary">
            <th className="py-2 pr-4">Categoria</th>
            <th className="py-2 pr-4 text-right">A pagar</th>
            <th className="py-2 text-right">A receber</th>
          </tr>
        </thead>
        <tbody>
          {data.rows.map((row) => (
            <tr key={row.category} className="border-b border-border last:border-0">
              <td className="py-2 pr-4 text-text">{row.category}</td>
              <td className="py-2 pr-4 text-right text-danger">{formatCurrency(row.payable)}</td>
              <td className="py-2 text-right text-success">{formatCurrency(row.receivable)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-border font-semibold">
            <td className="py-3 pr-4 text-text">Total do mês (por vencimento)</td>
            <td className="py-3 pr-4 text-right text-danger">{formatCurrency(data.totalPayable)}</td>
            <td className="py-3 text-right text-success">{formatCurrency(data.totalReceivable)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
