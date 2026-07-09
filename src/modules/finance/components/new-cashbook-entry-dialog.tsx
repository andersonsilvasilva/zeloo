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
import { cashbookEntryTypeValues, paymentMethodValues } from "@/modules/finance/schemas/finance.schema";
import { createCashbookEntryAction } from "@/modules/finance/actions/create-cashbook-entry.action";

const TYPE_LABELS: Record<(typeof cashbookEntryTypeValues)[number], string> = {
  CREDIT: "Entrada",
  DEBIT: "Saída",
};

const PAYMENT_METHOD_LABELS: Record<(typeof paymentMethodValues)[number], string> = {
  CASH: "Dinheiro",
  PIX: "Pix",
  CREDIT_CARD: "Cartão de crédito",
  DEBIT_CARD: "Cartão de débito",
  OTHER: "Outro",
};

export function NewCashbookEntryDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<(typeof cashbookEntryTypeValues)[number]>("DEBIT");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("0");
  const [category, setCategory] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [transactionDate, setTransactionDate] = useState(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setType("DEBIT");
    setDescription("");
    setAmount("0");
    setCategory("");
    setPaymentMethod("");
    setTransactionDate(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
    setNotes("");
    setError(null);
  }

  async function handleSubmit() {
    setBusy(true);
    setError(null);
    const result = await createCashbookEntryAction({
      type,
      description,
      amount: Number(amount),
      category,
      paymentMethod: paymentMethod ? (paymentMethod as (typeof paymentMethodValues)[number]) : undefined,
      transactionDate: new Date(transactionDate),
      notes,
    });
    setBusy(false);

    if (!result.success) {
      setError(result.error);
      return;
    }
    setOpen(false);
    reset();
    router.refresh();
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
        Novo lançamento
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo lançamento</DialogTitle>
            <DialogDescription>Entrada ou saída manual no livro-caixa.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="entry-type">Tipo</Label>
                <Select
                  id="entry-type"
                  value={type}
                  onChange={(e) => setType(e.target.value as (typeof cashbookEntryTypeValues)[number])}
                >
                  {cashbookEntryTypeValues.map((t) => (
                    <option key={t} value={t}>
                      {TYPE_LABELS[t]}
                    </option>
                  ))}
                </Select>
              </div>
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
            </div>

            <div className="space-y-1">
              <Label htmlFor="entry-description">Descrição</Label>
              <Input id="entry-description" value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="entry-category">Categoria</Label>
                <Input id="entry-category" value={category} onChange={(e) => setCategory(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="entry-payment-method">Forma de pagamento</Label>
                <Select id="entry-payment-method" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                  <option value="">—</option>
                  {paymentMethodValues.map((m) => (
                    <option key={m} value={m}>
                      {PAYMENT_METHOD_LABELS[m]}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="entry-date">Data</Label>
              <input
                id="entry-date"
                type="datetime-local"
                value={transactionDate}
                onChange={(e) => setTransactionDate(e.target.value)}
                className="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm text-text focus-gold"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="entry-notes">Observações</Label>
              <Textarea id="entry-notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>

            {error && <p className="text-sm text-danger">{error}</p>}

            <Button className="w-full" onClick={handleSubmit} disabled={busy || !description || Number(amount) <= 0}>
              {busy ? "Salvando..." : "Salvar lançamento"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
