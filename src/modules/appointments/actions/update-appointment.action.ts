"use server";

import { requirePermission, requireUserId } from "@/lib/auth/rbac";
import { PERMISSIONS } from "@/lib/auth/permissions";
import {
  rescheduleAppointmentSchema,
  type RescheduleAppointmentInput,
} from "@/modules/appointments/schemas/appointment.schema";
import {
  AppointmentConflictError,
  AppointmentNotFoundError,
  AppointmentService,
} from "@/modules/appointments/services/appointment.service";

/** Reagenda (barbeiro/data/horário/serviços) um agendamento existente. */
export async function updateAppointmentAction(rawInput: RescheduleAppointmentInput) {
  await requireUserId();
  await requirePermission(PERMISSIONS.appointments.update);

  const input = rescheduleAppointmentSchema.parse(rawInput);

  try {
    const service = new AppointmentService();
    const appointment = await service.update(input);
    return { success: true as const, appointment };
  } catch (error) {
    if (error instanceof AppointmentConflictError || error instanceof AppointmentNotFoundError) {
      return { success: false as const, error: error.message };
    }
    throw error;
  }
}
