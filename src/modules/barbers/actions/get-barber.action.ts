"use server";

import { requirePermission, requireUserId } from "@/lib/auth/rbac";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { barberIdSchema, type BarberIdInput } from "@/modules/barbers/schemas/barber.schema";
import { BarberService } from "@/modules/barbers/services/barber.service";

export async function getBarberAction(rawInput: BarberIdInput) {
  await requireUserId();
  await requirePermission(PERMISSIONS.barbers.view);

  const input = barberIdSchema.parse(rawInput);

  const service = new BarberService();
  return service.getById(input.id);
}
