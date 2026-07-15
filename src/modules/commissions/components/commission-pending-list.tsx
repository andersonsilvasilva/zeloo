"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency } from "@/lib/utils/format";
import { paymentMethodValues } from "@/modules/finance/schemas/finance.schema";
import { closeCommissionAction } from "@/modules/commissions/actions/close-commission.action";
import type { CommissionPendingRow } from "@/modules/commissions/types/commission.types";

const PAYMENT_METHOD_LABELS: Record<(typeof paymentMethodValues)[number], string> = {
  CASH: "Dinheiro",
  PIX: "Pix",
  CREDIT_CARD: "Cartão de crédito",
  DEBIT_CARD: "Cartão de débito",
  OTHER: "Outro",
};

export interface CommissionPendingListProps {
  rows: CommissionPendingRow[];
  periodStart: string;
  periodEnd: string;
  canClose: boolean;
}

export function CommissionPendingList({ rows, periodStart, periodEnd, canClose }: CommissionPendingListProps) {
  const router = useRouter();
  const [closingId, setClosingId] = useState<string | null>(null);
  const [finalAmount, setFinalAmount] = useState("0");
  const [adjustmentNotes, setAdjustmentNotes] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<(typeof paymentMethodValues)[number]>("CASH");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({});

  function startClosing(row: CommissionPendingRow) {
    setClosingId(row.professionalId);
    setFinalAmount(row.calculatedAmount.toFixed(2));
    setAdjustmentNotes("");
    setPaymentMethod("CASH");
  }

  async function handleConfirm(professionalId: string) {
    setBusyId(professionalId);
    setRowErrors((prev) => ({ ...prev, [professionalId]: "" }));
    const result = await closeCommissionAction({
      professionalId,
      periodStart: new Date(periodStart),
      periodEnd: new Date(periodEnd),
      finalAmount: Number(finalAmount),
      adjustmentNotes,
      paymentMethod,
    });
    setBusyId(null);
    if (!result.success) {
      setRowErrors((prev) => ({ ...prev, [professionalId]: result.error }));
      return;
    }
    setClosingId(null);
    router.refresh();
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-text-secondary">
        Nenhum profissional com comissão no período selecionado.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {rows.map((row) => (
        <div key={row.professionalId} className="rounded-xl border border-border bg-card p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={row.alreadyClosed ? "success" : "warning"}>
                {row.alreadyClosed ? "Fechada" : "Pendente"}
              </Badge>
              <span className="font-medium text-text">{row.professionalName}</span>
              <span className="text-xs text-text-secondary">({row.commissionPercentage}%)</span>
            </div>
            <span className="font-medium text-text">{formatCurrency(row.calculatedAmount)}</span>
          </div>
          <p className="mt-1 text-xs text-text-secondary">Receita no período: {formatCurrency(row.revenue)}</p>

          {!row.alreadyClosed && canClose && (
            <div className="mt-3 print:hidden">
              {closingId !== row.professionalId ? (
                <Button variant="primary" size="sm" onClick={() => startClosing(row)}>
                  <CheckCircle2 size={14} />
                  Fechar comissão
                </Button>
              ) : (
                <div className="space-y-3 rounded-lg border border-border bg-background p-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor={`final-amount-${row.professionalId}`}>Valor final</Label>
                      <Input
                        id={`final-amount-${row.professionalId}`}
                        type="number"
                        step="0.01"
                        min={0}
                        value={finalAmount}
                        onChange={(e) => setFinalAmount(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor={`payment-method-${row.professionalId}`}>Forma de pagamento</Label>
                      <Select
                        id={`payment-method-${row.professionalId}`}
                        value={paymentMethod}
                        onChange={(e) => setPaymentMethod(e.target.value as (typeof paymentMethodValues)[number])}
                      >
                        {paymentMethodValues.map((m) => (
                          <option key={m} value={m}>
                            {PAYMENT_METHOD_LABELS[m]}
                          </option>
                        ))}
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor={`adjustment-notes-${row.professionalId}`}>
                      Motivo do ajuste (se o valor final for diferente do calculado)
                    </Label>
                    <Textarea
                      id={`adjustment-notes-${row.professionalId}`}
                      rows={2}
                      value={adjustmentNotes}
                      onChange={(e) => setAdjustmentNotes(e.target.value)}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleConfirm(row.professionalId)}
                      disabled={busyId === row.professionalId}
                    >
                      {busyId === row.professionalId ? "Confirmando..." : "Confirmar fechamento"}
                    </Button>
                    <Button variant="secondary" size="sm" onClick={() => setClosingId(null)}>
                      Cancelar
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
          {rowErrors[row.professionalId] && (
            <p className="mt-2 text-sm text-danger">{rowErrors[row.professionalId]}</p>
          )}
        </div>
      ))}
    </div>
  );
}
