"use server";

import { revalidatePath } from "next/cache";
import { requirePermission, requireUserId } from "@/lib/auth/rbac";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { appointmentIdSchema, type AppointmentIdInput } from "@/modules/appointments/schemas/appointment.schema";
import {
  AppointmentHasPaymentError,
  AppointmentNotFoundError,
  AppointmentService,
} from "@/modules/appointments/services/appointment.service";

/** Exclusão definitiva de um agendamento — restrita ao Administrador. */
export async function deleteAppointmentAction(rawInput: AppointmentIdInput) {
  await requireUserId();
  await requirePermission(PERMISSIONS.appointments.delete);

  const input = appointmentIdSchema.parse(rawInput);

  try {
    const service = new AppointmentService();
    await service.delete(input.id);
    revalidatePath("/");
    revalidatePath("/relatorios");
    revalidatePath("/agenda");
    return { success: true as const };
  } catch (error) {
    if (error instanceof AppointmentNotFoundError || error instanceof AppointmentHasPaymentError) {
      return { success: false as const, error: error.message };
    }
    throw error;
  }
}
