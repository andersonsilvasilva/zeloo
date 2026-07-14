"use client";

import { useState } from "react";
import { ExternalLink, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { paymentMethodValues } from "@/modules/finance/schemas/finance.schema";
import { registerPaymentAction } from "@/modules/finance/actions/register-payment.action";
import { createPixChargeAction } from "@/modules/finance/actions/create-pix-charge.action";
import { PixChargePanel } from "@/modules/finance/components/pix-charge-panel";
import type { PixChargeInfo } from "@/modules/finance/types/finance.types";

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
  const [pixCharge, setPixCharge] = useState<PixChargeInfo | null>(null);
  const [completedPaymentId, setCompletedPaymentId] = useState<string | null>(null);

  function handleClose() {
    setOpen(false);
    setPixCharge(null);
    setCompletedPaymentId(null);
  }

  async function handleSubmit() {
    setBusy(true);
    setError(null);

    if (paymentMethod === "PIX") {
      const result = await createPixChargeAction({ appointmentId, amount: Number(amount) });
      setBusy(false);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setPixCharge(result.charge);
      return;
    }

    const result = await registerPaymentAction({ appointmentId, amount: Number(amount), paymentMethod });
    setBusy(false);

    if (!result.success) {
      setError(result.error);
      return;
    }
    onRegistered();
    setCompletedPaymentId(result.paymentId);
  }

  return (
    <>
      <Button variant="primary" size="sm" onClick={() => setOpen(true)}>
        <Wallet size={14} />
        Registrar pagamento
      </Button>

      <Dialog open={open} onOpenChange={(next) => (next ? setOpen(true) : handleClose())}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {completedPaymentId ? "Pagamento registrado" : pixCharge ? "Cobrança Pix" : "Registrar pagamento"}
            </DialogTitle>
            <DialogDescription>
              {completedPaymentId
                ? "O pagamento foi registrado com sucesso."
                : pixCharge
                  ? "Peça para o cliente escanear o QR code ou usar o Pix copia e cola."
                  : "Dá baixa no pagamento deste atendimento."}
            </DialogDescription>
          </DialogHeader>

          {completedPaymentId ? (
            <div className="space-y-4">
              <a
                href={`/financeiro/recibo/${completedPaymentId}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 text-sm text-primary underline"
              >
                <ExternalLink className="h-4 w-4" />
                Ver recibo
              </a>
              <Button type="button" className="w-full" onClick={handleClose}>
                Fechar
              </Button>
            </div>
          ) : pixCharge ? (
            <PixChargePanel
              charge={pixCharge}
              onConfirmed={(paymentId) => {
                onRegistered();
                setCompletedPaymentId(paymentId);
              }}
              onClose={() => setPixCharge(null)}
            />
          ) : (
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
                {busy ? "Processando..." : paymentMethod === "PIX" ? "Gerar cobrança Pix" : "Confirmar pagamento"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
