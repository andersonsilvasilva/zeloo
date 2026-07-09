import { formatCurrency } from "@/lib/utils/format";
import type { BalanceteSummary } from "@/modules/finance/types/finance.types";

export function BalanceteTable({ data }: { data: BalanceteSummary }) {
  if (data.rows.length === 0) {
    return <p className="text-sm text-text-secondary">Nenhum lançamento no período selecionado.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-text-secondary">
            <th className="py-2 pr-4">Categoria</th>
            <th className="py-2 pr-4 text-right">Crédito</th>
            <th className="py-2 pr-4 text-right">Débito</th>
            <th className="py-2 text-right">Saldo</th>
          </tr>
        </thead>
        <tbody>
          {data.rows.map((row) => (
            <tr key={row.category} className="border-b border-border last:border-0">
              <td className="py-2 pr-4 text-text">{row.category}</td>
              <td className="py-2 pr-4 text-right text-success">{formatCurrency(row.credit)}</td>
              <td className="py-2 pr-4 text-right text-danger">{formatCurrency(row.debit)}</td>
              <td className={`py-2 text-right font-medium ${row.balance >= 0 ? "text-success" : "text-danger"}`}>
                {formatCurrency(row.balance)}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-border font-semibold">
            <td className="py-3 pr-4 text-text">Total</td>
            <td className="py-3 pr-4 text-right text-success">{formatCurrency(data.totalCredit)}</td>
            <td className="py-3 pr-4 text-right text-danger">{formatCurrency(data.totalDebit)}</td>
            <td className={`py-3 text-right ${data.totalBalance >= 0 ? "text-success" : "text-danger"}`}>
              {formatCurrency(data.totalBalance)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
