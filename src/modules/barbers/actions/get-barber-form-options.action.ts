"use server";

import { requirePermission, requireUserId } from "@/lib/auth/rbac";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { BarberService } from "@/modules/barbers/services/barber.service";

export async function getBarberFormOptionsAction() {
  await requireUserId();
  await requirePermission(PERMISSIONS.barbers.view);

  const service = new BarberService();
  return service.getFormOptions();
}
