"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { createAccountEntryAction } from "@/modules/accounts/actions/create-account-entry.action";
import type { AccountDirection } from "@/modules/accounts/schemas/account.schema";
import type { AccountClientOption } from "@/modules/accounts/types/account.types";

export interface AccountEntryFormDialogProps {
  direction: AccountDirection;
  clientOptions: AccountClientOption[];
}

export function AccountEntryFormDialog({ direction, clientOptions }: AccountEntryFormDialogProps) {
  const router = useRouter();
  const isReceivable = direction === "RECEIVABLE";
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("0");
  const [category, setCategory] = useState("");
  const [counterpartyName, setCounterpartyName] = useState("");
  const [clientId, setClientId] = useState("");
  const [dueDate, setDueDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setDescription("");
    setAmount("0");
    setCategory("");
    setCounterpartyName("");
    setClientId("");
    setDueDate(format(new Date(), "yyyy-MM-dd"));
    setNotes("");
    setError(null);
  }

  async function handleSubmit() {
    setBusy(true);
    setError(null);
    try {
      await createAccountEntryAction({
        direction,
        description,
        amount: Number(amount),
        category,
        counterpartyName,
        clientId: clientId || undefined,
        dueDate: new Date(dueDate),
        notes,
      });
      setOpen(false);
      reset();
      router.refresh();
    } catch {
      setError("Não foi possível salvar a conta.");
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
        <Plus className="h-4 w-4" />
        {isReceivable ? "Nova conta a receber" : "Nova conta a pagar"}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isReceivable ? "Nova conta a receber" : "Nova conta a pagar"}</DialogTitle>
            <DialogDescription>
              {isReceivable ? "Receita avulsa não ligada a um agendamento." : "Despesa com vencimento a controlar."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="entry-description">Descrição</Label>
              <Input id="entry-description" value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="entry-amount">Valor</Label>
                <Input
                  id="entry-amount"
                  type="number"
                  step="0.01"
                  min={0}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="entry-due-date">Vencimento</Label>
                <input
                  id="entry-due-date"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm text-text focus-gold"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="entry-category">Categoria</Label>
                <Input id="entry-category" value={category} onChange={(e) => setCategory(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="entry-counterparty">{isReceivable ? "Nome (opcional)" : "Fornecedor"}</Label>
                <Input
                  id="entry-counterparty"
                  value={counterpartyName}
                  onChange={(e) => setCounterpartyName(e.target.value)}
                  placeholder={isReceivable ? "Ex: Parceria X" : "Ex: Companhia de água"}
                />
              </div>
            </div>

            {isReceivable && (
              <div className="space-y-1">
                <Label htmlFor="entry-client">Cliente cadastrado (opcional)</Label>
                <Select id="entry-client" value={clientId} onChange={(e) => setClientId(e.target.value)}>
                  <option value="">— Nenhum —</option>
                  {clientOptions.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              </div>
            )}

            <div className="space-y-1">
              <Label htmlFor="entry-notes">Observações</Label>
              <Textarea id="entry-notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>

            {error && <p className="text-sm text-danger">{error}</p>}

            <Button className="w-full" onClick={handleSubmit} disabled={busy || !description || Number(amount) <= 0}>
              {busy ? "Salvando..." : "Salvar conta"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
