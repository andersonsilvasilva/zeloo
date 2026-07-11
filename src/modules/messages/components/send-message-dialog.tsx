"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Send } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { formatCurrency } from "@/lib/utils/format";
import { sendMessageAction } from "@/modules/messages/actions/send-message.action";
import { listClientAppointmentsAction } from "@/modules/messages/actions/list-client-appointments.action";
import type { MessageAppointmentOption, MessageFormOptions } from "@/modules/messages/types/message.types";

const APPOINTMENT_PLACEHOLDERS = ["{{barber_agendado}}", "{{resumo_agendamento}}"];

function appointmentSummary(appointment: MessageAppointmentOption): string {
  const when = format(appointment.startTime, "dd/MM/yyyy 'às' HH:mm");
  return `${appointment.servicesLabel} — ${when} — ${formatCurrency(appointment.totalPrice)}`;
}

export function SendMessageDialog({ options }: { options: MessageFormOptions }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [clientId, setClientId] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [appointmentId, setAppointmentId] = useState("");
  const [appointments, setAppointments] = useState<MessageAppointmentOption[]>([]);
  const [loadingAppointments, setLoadingAppointments] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedClient = options.clients.find((c) => c.id === clientId);
  const selectedTemplate = options.templates.find((t) => t.id === templateId);
  const selectedAppointment = appointments.find((a) => a.id === appointmentId);

  const needsAppointment = useMemo(
    () => Boolean(selectedTemplate && APPOINTMENT_PLACEHOLDERS.some((p) => selectedTemplate.content.includes(p))),
    [selectedTemplate],
  );

  useEffect(() => {
    setAppointmentId("");
    if (!clientId) {
      setAppointments([]);
      return;
    }
    setLoadingAppointments(true);
    listClientAppointmentsAction({ clientId })
      .then(setAppointments)
      .finally(() => setLoadingAppointments(false));
  }, [clientId]);

  const preview = useMemo(() => {
    if (!selectedTemplate) return "";
    let rendered = selectedTemplate.content.replaceAll("{{clientName}}", selectedClient?.name ?? "{{clientName}}");
    if (selectedAppointment) {
      rendered = rendered
        .replaceAll("{{barber_agendado}}", selectedAppointment.barberName)
        .replaceAll("{{resumo_agendamento}}", appointmentSummary(selectedAppointment));
    }
    return rendered;
  }, [selectedTemplate, selectedClient, selectedAppointment]);

  function reset() {
    setClientId("");
    setTemplateId("");
    setAppointmentId("");
    setAppointments([]);
    setError(null);
  }

  async function handleSend() {
    if (!clientId || !templateId) {
      setError("Selecione o cliente e o modelo.");
      return;
    }
    if (needsAppointment && !appointmentId) {
      setError("Este modelo usa dados do agendamento — selecione um agendamento.");
      return;
    }

    setSending(true);
    setError(null);
    const result = await sendMessageAction({ clientId, templateId, appointmentId: appointmentId || undefined });
    setSending(false);

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
        <Send className="h-4 w-4" />
        Nova mensagem
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enviar mensagem</DialogTitle>
            <DialogDescription>
              Selecione o cliente e o modelo. WhatsApp é enviado de verdade pela API da Meta; SMS ainda não está
              integrado a um provedor real — a mensagem fica registrada só no histórico.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="send-client">Cliente</Label>
              <Select id="send-client" value={clientId} onChange={(e) => setClientId(e.target.value)}>
                <option value="">Selecione o cliente</option>
                {options.clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                    {c.phone ? ` — ${c.phone}` : ""}
                  </option>
                ))}
              </Select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="send-template">Modelo</Label>
              <Select id="send-template" value={templateId} onChange={(e) => setTemplateId(e.target.value)}>
                <option value="">Selecione o modelo</option>
                {options.templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.channel === "WHATSAPP" ? "WhatsApp" : "SMS"})
                  </option>
                ))}
              </Select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="send-appointment">
                Agendamento{needsAppointment ? "" : " (opcional)"}
              </Label>
              <Select
                id="send-appointment"
                value={appointmentId}
                onChange={(e) => setAppointmentId(e.target.value)}
                disabled={!clientId || loadingAppointments}
              >
                <option value="">
                  {!clientId
                    ? "Selecione o cliente primeiro"
                    : loadingAppointments
                      ? "Carregando..."
                      : "Nenhum"}
                </option>
                {appointments.map((a) => (
                  <option key={a.id} value={a.id}>
                    {format(a.startTime, "dd/MM/yyyy HH:mm")} — {a.servicesLabel} — {a.barberName}
                  </option>
                ))}
              </Select>
              {needsAppointment && (
                <p className="text-xs text-text-secondary">
                  Este modelo usa {"{{barber_agendado}}"} e/ou {"{{resumo_agendamento}}"} — selecione um agendamento.
                </p>
              )}
            </div>

            {preview && (
              <div className="rounded-lg border border-border bg-background-secondary p-3">
                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-text-secondary">Prévia</p>
                <p className="whitespace-pre-wrap text-sm text-text">{preview}</p>
              </div>
            )}

            {error && <p className="text-sm text-danger">{error}</p>}

            <Button type="button" className="w-full" disabled={sending} onClick={handleSend}>
              {sending ? "Enviando..." : "Enviar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
