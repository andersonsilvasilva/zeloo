"use server";

import { requirePermission, requireUserId } from "@/lib/auth/rbac";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { appointmentIdSchema, type AppointmentIdInput } from "@/modules/appointments/schemas/appointment.schema";
import { AppointmentService } from "@/modules/appointments/services/appointment.service";

export async function getAppointmentAction(rawInput: AppointmentIdInput) {
  await requireUserId();
  await requirePermission(PERMISSIONS.appointments.view);

  const input = appointmentIdSchema.parse(rawInput);

  const service = new AppointmentService();
  return service.getById(input.id);
}
