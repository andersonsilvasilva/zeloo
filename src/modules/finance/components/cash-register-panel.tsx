"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { formatCurrency } from "@/lib/utils/format";
import { openCashRegisterAction } from "@/modules/finance/actions/open-cash-register.action";
import { closeCashRegisterAction } from "@/modules/finance/actions/close-cash-register.action";
import type { CashRegisterInfo } from "@/modules/finance/types/finance.types";

export interface CashRegisterPanelProps {
  initialRegister: CashRegisterInfo | null;
  canCreate: boolean;
  canUpdate: boolean;
}

export function CashRegisterPanel({ initialRegister, canCreate, canUpdate }: CashRegisterPanelProps) {
  const router = useRouter();
  const [openingBalance, setOpeningBalance] = useState("0");
  const [closeOpen, setCloseOpen] = useState(false);
  const [actualBalance, setActualBalance] = useState("0");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<{ expectedBalance: number; actualBalance: number; difference: number } | null>(
    null,
  );

  async function handleOpen() {
    setBusy(true);
    setError(null);
    const result = await openCashRegisterAction({ openingBalance: Number(openingBalance) });
    setBusy(false);

    if (!result.success) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  async function handleClose() {
    setBusy(true);
    setError(null);
    const result = await closeCashRegisterAction({ actualBalance: Number(actualBalance), notes });
    setBusy(false);

    if (!result.success) {
      setError(result.error);
      return;
    }
    setSummary(result.summary);
    setCloseOpen(false);
    router.refresh();
  }

  if (!initialRegister) {
    return (
      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="mb-1 text-sm font-medium text-text">Caixa fechado</h2>
        <p className="mb-4 text-sm text-text-secondary">Abra o caixa para registrar pagamentos e lançamentos.</p>

        {summary && (
          <div className="mb-4 rounded-lg border border-border bg-background-secondary p-3 text-sm">
            <p className="text-text-secondary">Último fechamento:</p>
            <p className="text-text">
              Esperado {formatCurrency(summary.expectedBalance)} · Informado {formatCurrency(summary.actualBalance)} ·
              Diferença{" "}
              <span className={summary.difference === 0 ? "text-success" : "text-danger"}>
                {formatCurrency(summary.difference)}
              </span>
            </p>
          </div>
        )}

        {canCreate && (
          <div className="flex flex-wrap items-end gap-3">
            <div className="w-40 space-y-1">
              <Label htmlFor="opening-balance">Valor de abertura</Label>
              <Input
                id="opening-balance"
                type="number"
                step="0.01"
                min={0}
                value={openingBalance}
                onChange={(e) => setOpeningBalance(e.target.value)}
              />
            </div>
            <Button onClick={handleOpen} disabled={busy}>
              {busy ? "Abrindo..." : "Abrir caixa"}
            </Button>
          </div>
        )}
        {error && <p className="mt-2 text-sm text-danger">{error}</p>}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-medium text-text">Caixa aberto</h2>
          <p className="text-sm text-text-secondary">
            Desde {format(initialRegister.openedAt, "dd/MM/yyyy HH:mm")} por{" "}
            {initialRegister.openedBy?.name ?? "Usuário removido"} ·
            Abertura: {formatCurrency(initialRegister.openingBalance)}
          </p>
        </div>
        {canUpdate && (
          <Button variant="secondary" onClick={() => setCloseOpen(true)}>
            Fechar caixa
          </Button>
        )}
      </div>

      <Dialog open={closeOpen} onOpenChange={setCloseOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Fechar caixa</DialogTitle>
            <DialogDescription>Informe o valor contado fisicamente para calcular a diferença.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="actual-balance">Valor apurado</Label>
              <Input
                id="actual-balance"
                type="number"
                step="0.01"
                min={0}
                value={actualBalance}
                onChange={(e) => setActualBalance(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="close-notes">Observações</Label>
              <Textarea id="close-notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
            {error && <p className="text-sm text-danger">{error}</p>}
            <Button className="w-full" onClick={handleClose} disabled={busy}>
              {busy ? "Fechando..." : "Confirmar fechamento"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
