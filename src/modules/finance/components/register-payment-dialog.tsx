"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Wallet } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { formatCurrency } from "@/lib/utils/format";
import { paymentMethodValues } from "@/modules/finance/schemas/finance.schema";
import { registerPaymentAction } from "@/modules/finance/actions/register-payment.action";
import type { PayableAppointmentOption } from "@/modules/finance/types/finance.types";

const PAYMENT_METHOD_LABELS: Record<(typeof paymentMethodValues)[number], string> = {
  CASH: "Dinheiro",
  PIX: "Pix",
  CREDIT_CARD: "Cartão de crédito",
  DEBIT_CARD: "Cartão de débito",
  OTHER: "Outro",
};

export function RegisterPaymentDialog({ appointments }: { appointments: PayableAppointmentOption[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [appointmentId, setAppointmentId] = useState("");
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<(typeof paymentMethodValues)[number]>("CASH");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selected = appointments.find((a) => a.id === appointmentId);

  const options = useMemo(
    () =>
      appointments.map((a) => ({
        value: a.id,
        label: `${format(a.startTime, "dd/MM HH:mm")} — ${a.clientName} (${a.professionalName}) — ${formatCurrency(
          a.totalPrice,
        )}`,
      })),
    [appointments],
  );

  function reset() {
    setAppointmentId("");
    setAmount("");
    setPaymentMethod("CASH");
    setError(null);
  }

  function handleSelectAppointment(id: string) {
    setAppointmentId(id);
    const appointment = appointments.find((a) => a.id === id);
    if (appointment) setAmount(String(appointment.totalPrice));
  }

  async function handleSubmit() {
    if (!appointmentId) {
      setError("Selecione o agendamento.");
      return;
    }

    setBusy(true);
    setError(null);
    const result = await registerPaymentAction({
      appointmentId,
      amount: Number(amount),
      paymentMethod,
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
        onClick={() => {
          reset();
          setOpen(true);
        }}
      >
        <Wallet className="h-4 w-4" />
        Registrar pagamento
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar pagamento</DialogTitle>
            <DialogDescription>Selecione um agendamento concluído para dar baixa no pagamento.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="pay-appointment">Agendamento</Label>
              <Select
                id="pay-appointment"
                value={appointmentId}
                onChange={(e) => handleSelectAppointment(e.target.value)}
              >
                <option value="">Selecione</option>
                {options.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
              {options.length === 0 && (
                <p className="text-xs text-text-secondary">
                  Nenhum agendamento concluído aguardando pagamento no momento.
                </p>
              )}
            </div>

            {selected && (
              <p className="text-xs text-text-secondary">Serviços: {selected.servicesLabel}</p>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="pay-amount">Valor</Label>
                <Input
                  id="pay-amount"
                  type="number"
                  step="0.01"
                  min={0}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="pay-method">Forma de pagamento</Label>
                <Select
                  id="pay-method"
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

            <Button
              className="w-full"
              onClick={handleSubmit}
              disabled={busy || !appointmentId || Number(amount) <= 0}
            >
              {busy ? "Registrando..." : "Confirmar pagamento"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
