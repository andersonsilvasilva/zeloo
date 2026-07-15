"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Repeat } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { createRecurringAccountEntryAction } from "@/modules/accounts/actions/create-recurring-account-entry.action";
import type { AccountDirection } from "@/modules/accounts/schemas/account.schema";
import type { AccountClientOption } from "@/modules/accounts/types/account.types";

export interface RecurringAccountEntryDialogProps {
  direction: AccountDirection;
  clientOptions: AccountClientOption[];
}

export function RecurringAccountEntryDialog({ direction, clientOptions }: RecurringAccountEntryDialogProps) {
  const router = useRouter();
  const isReceivable = direction === "RECEIVABLE";
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("0");
  const [category, setCategory] = useState("");
  const [counterpartyName, setCounterpartyName] = useState("");
  const [clientId, setClientId] = useState("");
  const [dayOfMonth, setDayOfMonth] = useState("5");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setDescription("");
    setAmount("0");
    setCategory("");
    setCounterpartyName("");
    setClientId("");
    setDayOfMonth("5");
    setError(null);
  }

  async function handleSubmit() {
    setBusy(true);
    setError(null);
    try {
      await createRecurringAccountEntryAction({
        direction,
        description,
        amount: Number(amount),
        category,
        counterpartyName,
        clientId: clientId || undefined,
        dayOfMonth: Number(dayOfMonth),
      });
      setOpen(false);
      reset();
      router.refresh();
    } catch {
      setError("Não foi possível salvar a conta recorrente.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Button
        variant="secondary"
        onClick={() => {
          reset();
          setOpen(true);
        }}
      >
        <Repeat className="h-4 w-4" />
        Nova conta recorrente
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova conta recorrente</DialogTitle>
            <DialogDescription>
              Gerada automaticamente todo mês no dia escolhido — ex: aluguel, assinatura de um cliente fixo.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="recurring-description">Descrição</Label>
              <Input id="recurring-description" value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="recurring-amount">Valor</Label>
                <Input
                  id="recurring-amount"
                  type="number"
                  step="0.01"
                  min={0}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="recurring-day">Dia do vencimento</Label>
                <Input
                  id="recurring-day"
                  type="number"
                  min={1}
                  max={28}
                  value={dayOfMonth}
                  onChange={(e) => setDayOfMonth(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="recurring-category">Categoria</Label>
                <Input id="recurring-category" value={category} onChange={(e) => setCategory(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="recurring-counterparty">{isReceivable ? "Nome (opcional)" : "Fornecedor"}</Label>
                <Input
                  id="recurring-counterparty"
                  value={counterpartyName}
                  onChange={(e) => setCounterpartyName(e.target.value)}
                />
              </div>
            </div>

            {isReceivable && (
              <div className="space-y-1">
                <Label htmlFor="recurring-client">Cliente cadastrado (opcional)</Label>
                <Select id="recurring-client" value={clientId} onChange={(e) => setClientId(e.target.value)}>
                  <option value="">— Nenhum —</option>
                  {clientOptions.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              </div>
            )}

            {error && <p className="text-sm text-danger">{error}</p>}

            <Button
              className="w-full"
              onClick={handleSubmit}
              disabled={busy || !description || Number(amount) <= 0}
            >
              {busy ? "Salvando..." : "Salvar conta recorrente"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
