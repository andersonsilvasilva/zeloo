"use client";

import { useState } from "react";
import { Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { paymentMethodValues } from "@/modules/finance/schemas/finance.schema";
import { registerPaymentAction } from "@/modules/finance/actions/register-payment.action";

const PAYMENT_METHOD_LABELS: Record<(typeof paymentMethodValues)[number], string> = {
  CASH: "Dinheiro",
  PIX: "Pix",
  CREDIT_CARD: "Cartão de crédito",
  DEBIT_CARD: "Cartão de débito",
  OTHER: "Outro",
};

export interface QuickRegisterPaymentButtonProps {
  appointmentId: string;
  suggestedAmount: number;
  onRegistered: () => void;
}

/** Atalho pra registrar o pagamento direto na Agenda, sem precisar ir em Financeiro procurar o agendamento na lista. */
export function QuickRegisterPaymentButton({
  appointmentId,
  suggestedAmount,
  onRegistered,
}: QuickRegisterPaymentButtonProps) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(String(suggestedAmount));
  const [paymentMethod, setPaymentMethod] = useState<(typeof paymentMethodValues)[number]>("CASH");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    setBusy(true);
    setError(null);
    const result = await registerPaymentAction({ appointmentId, amount: Number(amount), paymentMethod });
    setBusy(false);

    if (!result.success) {
      setError(result.error);
      return;
    }
    setOpen(false);
    onRegistered();
  }

  return (
    <>
      <Button variant="primary" size="sm" onClick={() => setOpen(true)}>
        <Wallet size={14} />
        Registrar pagamento
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar pagamento</DialogTitle>
            <DialogDescription>Dá baixa no pagamento deste atendimento.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="quick-pay-amount">Valor</Label>
                <Input
                  id="quick-pay-amount"
                  type="number"
                  step="0.01"
                  min={0}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="quick-pay-method">Forma de pagamento</Label>
                <Select
                  id="quick-pay-method"
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

            {error && <p className="text-sm text-danger">{error}</p>}

            <Button className="w-full" onClick={handleSubmit} disabled={busy || Number(amount) <= 0}>
              {busy ? "Registrando..." : "Confirmar pagamento"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
