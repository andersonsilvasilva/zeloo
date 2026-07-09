"use server";

import { requirePermission, requireUserId } from "@/lib/auth/rbac";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { updateBarberSchema, type UpdateBarberInput } from "@/modules/barbers/schemas/barber.schema";
import { BarberNotFoundError, BarberService } from "@/modules/barbers/services/barber.service";

export async function updateBarberAction(rawInput: UpdateBarberInput) {
  await requireUserId();
  await requirePermission(PERMISSIONS.barbers.update);

  const input = updateBarberSchema.parse(rawInput);

  try {
    const service = new BarberService();
    const barber = await service.update(input);
    return { success: true as const, barber };
  } catch (error) {
    if (error instanceof BarberNotFoundError) {
      return { success: false as const, error: error.message };
    }
    throw error;
  }
}
