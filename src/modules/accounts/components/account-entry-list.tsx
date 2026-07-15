"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Trash2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { formatCurrency } from "@/lib/utils/format";
import { formatDateOnlyBR } from "@/lib/utils/date-only";
import { paymentMethodValues } from "@/modules/finance/schemas/finance.schema";
import { settleAccountEntryAction } from "@/modules/accounts/actions/settle-account-entry.action";
import { cancelAccountEntryAction } from "@/modules/accounts/actions/cancel-account-entry.action";
import { deleteAccountEntryAction } from "@/modules/accounts/actions/delete-account-entry.action";
import type { AccountDirection } from "@/modules/accounts/schemas/account.schema";
import type { AccountEntryItem } from "@/modules/accounts/types/account.types";

const PAYMENT_METHOD_LABELS: Record<(typeof paymentMethodValues)[number], string> = {
  CASH: "Dinheiro",
  PIX: "Pix",
  CREDIT_CARD: "Cartão de crédito",
  DEBIT_CARD: "Cartão de débito",
  OTHER: "Outro",
};

const STATUS_LABELS = { PENDING: "Pendente", SETTLED: "Liquidada", CANCELLED: "Cancelada" } as const;

export interface AccountEntryListProps {
  direction: AccountDirection;
  entries: AccountEntryItem[];
  canUpdate: boolean;
  canDelete: boolean;
}

export function AccountEntryList({ direction, entries, canUpdate, canDelete }: AccountEntryListProps) {
  const router = useRouter();
  const [settlingId, setSettlingId] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<(typeof paymentMethodValues)[number]>("CASH");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({});

  async function handleSettle(id: string) {
    setBusyId(id);
    setRowErrors((prev) => ({ ...prev, [id]: "" }));
    const result = await settleAccountEntryAction({ id, direction, paymentMethod });
    setBusyId(null);
    if (!result.success) {
      setRowErrors((prev) => ({ ...prev, [id]: result.error }));
      return;
    }
    setSettlingId(null);
    router.refresh();
  }

  async function handleCancel(id: string) {
    if (!confirm("Cancelar esta conta? Ela deixa de contar como pendente, mas fica no histórico.")) return;
    setBusyId(id);
    const result = await cancelAccountEntryAction({ id, direction });
    setBusyId(null);
    if (!result.success) {
      setRowErrors((prev) => ({ ...prev, [id]: result.error }));
      return;
    }
    router.refresh();
  }

  async function handleDelete(id: string) {
    if (!confirm("Excluir esta conta definitivamente?")) return;
    setBusyId(id);
    const result = await deleteAccountEntryAction({ id, direction });
    setBusyId(null);
    if (!result.success) {
      setRowErrors((prev) => ({ ...prev, [id]: result.error }));
      return;
    }
    router.refresh();
  }

  if (entries.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-text-secondary">
        Nenhuma conta encontrada para o filtro selecionado.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {entries.map((entry) => (
        <div key={entry.id} className="rounded-xl border border-border bg-card p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant={
                  entry.status === "SETTLED"
                    ? "success"
                    : entry.status === "CANCELLED"
                      ? "neutral"
                      : entry.overdue
                        ? "danger"
                        : "warning"
                }
              >
                {entry.status === "PENDING" && entry.overdue ? "Vencida" : STATUS_LABELS[entry.status]}
              </Badge>
              <span className="font-medium text-text">{entry.description}</span>
            </div>
            <span className={direction === "RECEIVABLE" ? "font-medium text-success" : "font-medium text-danger"}>
              {formatCurrency(entry.amount)}
            </span>
          </div>
          <p className="mt-1 text-xs text-text-secondary">
            Vencimento: {formatDateOnlyBR(entry.dueDate)}
            {entry.category ? ` · ${entry.category}` : ""}
            {entry.client ? ` · ${entry.client.name}` : entry.counterpartyName ? ` · ${entry.counterpartyName}` : ""}
          </p>
          {entry.notes && <p className="mt-1 text-xs text-text-secondary">Obs: {entry.notes}</p>}

          {entry.status === "PENDING" && (canUpdate || canDelete) && (
            <div className="mt-3 flex flex-wrap items-center gap-2 print:hidden">
              {canUpdate && settlingId !== entry.id && (
                <Button variant="primary" size="sm" onClick={() => setSettlingId(entry.id)}>
                  <CheckCircle2 size={14} />
                  {direction === "RECEIVABLE" ? "Receber" : "Pagar"}
                </Button>
              )}
              {settlingId === entry.id && (
                <>
                  <Select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as (typeof paymentMethodValues)[number])}
                    className="h-9 w-40"
                  >
                    {paymentMethodValues.map((m) => (
                      <option key={m} value={m}>
                        {PAYMENT_METHOD_LABELS[m]}
                      </option>
                    ))}
                  </Select>
                  <Button size="sm" onClick={() => handleSettle(entry.id)} disabled={busyId === entry.id}>
                    {busyId === entry.id ? "Confirmando..." : "Confirmar"}
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => setSettlingId(null)}>
                    Cancelar
                  </Button>
                </>
              )}
              {canUpdate && settlingId !== entry.id && (
                <Button variant="secondary" size="sm" onClick={() => handleCancel(entry.id)} disabled={busyId === entry.id}>
                  <XCircle size={14} />
                  Cancelar conta
                </Button>
              )}
              {canDelete && settlingId !== entry.id && (
                <Button variant="danger" size="sm" onClick={() => handleDelete(entry.id)} disabled={busyId === entry.id}>
                  <Trash2 size={14} />
                  Excluir
                </Button>
              )}
            </div>
          )}
          {rowErrors[entry.id] && <p className="mt-2 text-sm text-danger">{rowErrors[entry.id]}</p>}
        </div>
      ))}
    </div>
  );
}
