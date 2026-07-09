"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AppointmentForm, type AppointmentFormDefaultValues } from "@/modules/appointments/components/appointment-form";
import type { AppointmentFormOptions } from "@/modules/appointments/types/appointment.types";

export interface AppointmentFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  options: AppointmentFormOptions;
  mode: "create" | "edit";
  appointmentId?: string;
  defaultValues?: AppointmentFormDefaultValues;
  onSuccess: () => void;
}

export function AppointmentFormDialog({
  open,
  onOpenChange,
  options,
  mode,
  appointmentId,
  defaultValues,
  onSuccess,
}: AppointmentFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Novo agendamento" : "Reagendar"}</DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Selecione o cliente, os serviços, o barbeiro e o horário desejado."
              : "Ajuste o barbeiro, os serviços ou o horário deste agendamento."}
          </DialogDescription>
        </DialogHeader>
        <AppointmentForm
          key={appointmentId ?? "new"}
          options={options}
          mode={mode}
          appointmentId={appointmentId}
          defaultValues={defaultValues}
          onSuccess={onSuccess}
        />
      </DialogContent>
    </Dialog>
  );
}
