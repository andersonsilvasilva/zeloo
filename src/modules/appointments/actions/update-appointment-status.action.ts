"use server";

import { requirePermission, requireUserId } from "@/lib/auth/rbac";
import { PERMISSIONS } from "@/lib/auth/permissions";
import {
  updateAppointmentStatusSchema,
  type UpdateAppointmentStatusInput,
} from "@/modules/appointments/schemas/appointment.schema";
import {
  AppointmentNotFoundError,
  AppointmentService,
  InvalidStatusTransitionError,
} from "@/modules/appointments/services/appointment.service";

/** Muda o status de um agendamento (confirmar, iniciar, concluir, cancelar, não compareceu). */
export async function updateAppointmentStatusAction(rawInput: UpdateAppointmentStatusInput) {
  await requireUserId();

  const input = updateAppointmentStatusSchema.parse(rawInput);

  // Cancelamento tem permissão própria (spec: appointments.cancel); demais
  // transições de status usam appointments.update.
  await requirePermission(
    input.status === "CANCELLED" ? PERMISSIONS.appointments.cancel : PERMISSIONS.appointments.update,
  );

  try {
    const service = new AppointmentService();
    const appointment = await service.updateStatus(input.id, input.status);
    return { success: true as const, appointment };
  } catch (error) {
    if (error instanceof AppointmentNotFoundError || error instanceof InvalidStatusTransitionError) {
      return { success: false as const, error: error.message };
    }
    throw error;
  }
}
