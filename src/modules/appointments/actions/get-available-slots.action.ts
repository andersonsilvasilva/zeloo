"use server";

import { requirePermission, requireUserId } from "@/lib/auth/rbac";
import { PERMISSIONS } from "@/lib/auth/permissions";
import {
  getAvailableSlotsSchema,
  type GetAvailableSlotsInput,
} from "@/modules/appointments/schemas/appointment.schema";
import { AppointmentService } from "@/modules/appointments/services/appointment.service";

/** Calcula os horários livres de um barbeiro numa data, dado o conjunto de serviços selecionados. */
export async function getAvailableSlotsAction(rawInput: GetAvailableSlotsInput) {
  await requireUserId();
  await requirePermission(PERMISSIONS.appointments.view);

  const input = getAvailableSlotsSchema.parse(rawInput);

  const service = new AppointmentService();
  return service.getAvailableSlots(input);
}
