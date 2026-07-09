"use server";

import { requirePermission, requireUserId } from "@/lib/auth/rbac";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { createBarberSchema, type CreateBarberInput } from "@/modules/barbers/schemas/barber.schema";
import { BarberService } from "@/modules/barbers/services/barber.service";

export async function createBarberAction(rawInput: CreateBarberInput) {
  await requireUserId();
  await requirePermission(PERMISSIONS.barbers.create);

  const input = createBarberSchema.parse(rawInput);

  const service = new BarberService();
  const barber = await service.create(input);
  return { success: true as const, barber };
}
