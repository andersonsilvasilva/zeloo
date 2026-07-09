"use server";

import { requirePermission, requireUserId } from "@/lib/auth/rbac";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { AppointmentService } from "@/modules/appointments/services/appointment.service";

/** Retorna serviços, barbeiros (com os serviços que atendem) e clientes ativos para o formulário de agendamento. */
export async function getAppointmentFormOptionsAction() {
  await requireUserId();
  await requirePermission(PERMISSIONS.appointments.view);

  const service = new AppointmentService();
  return service.getFormOptions();
}
