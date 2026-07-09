"use server";

import { requirePermission, requireUserId } from "@/lib/auth/rbac";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { AppointmentService } from "@/modules/appointments/services/appointment.service";

export async function listTodayAppointmentsAction() {
  const userId = await requireUserId();
  await requirePermission(PERMISSIONS.appointments.view);

  const service = new AppointmentService();
  return service.listToday(userId);
}
