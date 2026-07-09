"use server";

import { requirePermission, requireUserId } from "@/lib/auth/rbac";
import { PERMISSIONS } from "@/lib/auth/permissions";
import {
  listAppointmentsSchema,
  type ListAppointmentsInput,
} from "@/modules/appointments/schemas/appointment.schema";
import { AppointmentService } from "@/modules/appointments/services/appointment.service";

export async function listAppointmentsAction(rawInput: ListAppointmentsInput) {
  await requireUserId();
  await requirePermission(PERMISSIONS.appointments.view);

  const input = listAppointmentsSchema.parse(rawInput);

  const service = new AppointmentService();
  return service.list(input);
}
