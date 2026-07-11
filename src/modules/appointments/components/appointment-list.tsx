"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils/format";
import { formatInBarbershopTz } from "@/lib/utils/timezone";
import { AppointmentStatusBadge } from "@/modules/appointments/components/appointment-status-badge";
import { AppointmentFormDialog } from "@/modules/appointments/components/appointment-form-dialog";
import { updateAppointmentStatusAction } from "@/modules/appointments/actions/update-appointment-status.action";
import { deleteAppointmentAction } from "@/modules/appointments/actions/delete-appointment.action";
import { formatDateOnlyBR } from "@/modules/appointments/utils/date-only";
import { sendAppointmentConfirmationAction } from "@/modules/messages/actions/send-appointment-confirmation.action";
import { QuickRegisterPaymentButton } from "@/modules/finance/components/quick-register-payment-button";
import type {
  AppointmentFormOptions,
  AppointmentListItem,
  AppointmentStatus,
} from "@/modules/appointments/types/appointment.types";

/** Próximas transições sugeridas na UI — a regra definitiva vive em AppointmentService (server). */
const NEXT_ACTIONS: Record<AppointmentStatus, { label: string; status: AppointmentStatus; variant: "primary" | "secondary" | "danger" }[]> = {
  PENDING: [
    { label: "Confirmar", status: "CONFIRMED", variant: "primary" },
    { label: "Cancelar", status: "CANCELLED", variant: "danger" },
  ],
  CONFIRMED: [
    { label: "Iniciar atendimento", status: "IN_PROGRESS", variant: "primary" },
    { label: "Não compareceu", status: "NO_SHOW", variant: "secondary" },
    { label: "Cancelar", status: "CANCELLED", variant: "danger" },
  ],
  IN_PROGRESS: [
    { label: "Concluir", status: "COMPLETED", variant: "primary" },
    { label: "Cancelar", status: "CANCELLED", variant: "danger" },
  ],
  COMPLETED: [],
  CANCELLED: [],
  NO_SHOW: [],
};

const RESCHEDULABLE_STATUSES: AppointmentStatus[] = ["PENDING", "CONFIRMED"];

export interface AppointmentListProps {
  appointments: AppointmentListItem[];
  options: AppointmentFormOptions;
  canUpdate: boolean;
  canCancel: boolean;
  canSendMessages: boolean;
  canRegisterPayment: boolean;
  canDelete: boolean;
  timezone: string;
}

export function AppointmentList({
  appointments,
  options,
  canUpdate,
  canCancel,
  canSendMessages,
  canRegisterPayment,
  canDelete,
  timezone,
}: AppointmentListProps) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({});
  const [rowSuccess, setRowSuccess] = useState<Record<string, string>>({});
  const [editing, setEditing] = useState<AppointmentListItem | null>(null);

  async function handleStatusChange(appointment: AppointmentListItem, status: AppointmentStatus) {
    setPendingId(appointment.id);
    setRowErrors((prev) => ({ ...prev, [appointment.id]: "" }));

    const result = await updateAppointmentStatusAction({ id: appointment.id, status });

    setPendingId(null);
    if (!result.success) {
      setRowErrors((prev) => ({ ...prev, [appointment.id]: result.error }));
      return;
    }
    router.refresh();
  }

  async function handleDelete(appointment: AppointmentListItem) {
    if (!confirm(`Excluir definitivamente o agendamento de ${appointment.client.name}?`)) return;

    setPendingId(appointment.id);
    setRowErrors((prev) => ({ ...prev, [appointment.id]: "" }));

    const result = await deleteAppointmentAction({ id: appointment.id });

    setPendingId(null);
    if (!result.success) {
      setRowErrors((prev) => ({ ...prev, [appointment.id]: result.error }));
      return;
    }
    router.refresh();
  }

  async function handleSendConfirmation(appointment: AppointmentListItem) {
    setPendingId(appointment.id);
    setRowErrors((prev) => ({ ...prev, [appointment.id]: "" }));
    setRowSuccess((prev) => ({ ...prev, [appointment.id]: "" }));

    const result = await sendAppointmentConfirmationAction({ appointmentId: appointment.id });

    setPendingId(null);
    if (!result.success) {
      setRowErrors((prev) => ({ ...prev, [appointment.id]: result.error }));
      return;
    }
    setRowSuccess((prev) => ({ ...prev, [appointment.id]: "Confirmação enviada." }));
  }

  if (appointments.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-text-secondary">
        Nenhum agendamento encontrado para o filtro selecionado.
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {appointments.map((appointment) => {
          const actions = NEXT_ACTIONS[appointment.status].filter(
            (action) => action.status !== "CANCELLED" || canCancel,
          );
          const canReschedule = canUpdate && RESCHEDULABLE_STATUSES.includes(appointment.status);

          return (
            <div key={appointment.id} className="rounded-xl border border-border bg-card p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-text">
                      {formatDateOnlyBR(appointment.appointmentDate)} às{" "}
                      {formatInBarbershopTz(appointment.startTime, timezone, "HH:mm")}
                    </span>
                    <AppointmentStatusBadge status={appointment.status} />
                    {appointment.status === "COMPLETED" && !appointment.hasPayment && (
                      <Badge variant="warning">Pagamento pendente</Badge>
                    )}
                  </div>
                  <p className="text-sm text-text-secondary">
                    {appointment.client.name} · {appointment.barber.professionalName}
                  </p>
                  <p className="text-sm text-text-secondary">
                    {appointment.services.map((s) => s.name).join(", ")} · {formatCurrency(appointment.totalPrice)} ·{" "}
                    {appointment.totalDurationMinutes}min
                  </p>
                  {appointment.notes && <p className="text-xs text-text-secondary">Obs: {appointment.notes}</p>}
                </div>

                <div className="flex flex-wrap gap-2">
                  {canReschedule && (
                    <Button variant="secondary" size="sm" onClick={() => setEditing(appointment)}>
                      Reagendar
                    </Button>
                  )}
                  {canSendMessages && appointment.status !== "CANCELLED" && (
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={pendingId === appointment.id}
                      onClick={() => handleSendConfirmation(appointment)}
                    >
                      Enviar confirmação
                    </Button>
                  )}
                  {actions.map((action) => (
                    <Button
                      key={action.status}
                      variant={action.variant}
                      size="sm"
                      disabled={pendingId === appointment.id}
                      onClick={() => handleStatusChange(appointment, action.status)}
                    >
                      {action.label}
                    </Button>
                  ))}
                  {canRegisterPayment && appointment.status === "COMPLETED" && !appointment.hasPayment && (
                    <QuickRegisterPaymentButton
                      appointmentId={appointment.id}
                      suggestedAmount={appointment.totalPrice}
                      onRegistered={() => router.refresh()}
                    />
                  )}
                  {canDelete && (
                    <Button
                      variant="danger"
                      size="sm"
                      disabled={pendingId === appointment.id}
                      onClick={() => handleDelete(appointment)}
                    >
                      Excluir
                    </Button>
                  )}
                </div>
              </div>
              {rowErrors[appointment.id] && (
                <p className="mt-2 text-sm text-danger">{rowErrors[appointment.id]}</p>
              )}
              {rowSuccess[appointment.id] && (
                <p className="mt-2 text-sm text-success">{rowSuccess[appointment.id]}</p>
              )}
            </div>
          );
        })}
      </div>

      {editing && (
        <AppointmentFormDialog
          open={Boolean(editing)}
          onOpenChange={(open) => !open && setEditing(null)}
          options={options}
          mode="edit"
          appointmentId={editing.id}
          defaultValues={{
            clientId: editing.client.id,
            barberId: editing.barber.id,
            serviceIds: editing.services.map((s) => s.id),
            appointmentDate: editing.appointmentDate,
            startTime: editing.startTime,
            notes: editing.notes,
          }}
          onSuccess={() => {
            setEditing(null);
            router.refresh();
          }}
        />
      )}
    </>
  );
}
