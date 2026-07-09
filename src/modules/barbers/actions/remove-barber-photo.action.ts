"use server";

import { requirePermission, requireUserId } from "@/lib/auth/rbac";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { barberIdSchema, type BarberIdInput } from "@/modules/barbers/schemas/barber.schema";
import { BarberService } from "@/modules/barbers/services/barber.service";

export async function removeBarberPhotoAction(rawInput: BarberIdInput) {
  await requireUserId();
  await requirePermission(PERMISSIONS.barbers.update);

  const input = barberIdSchema.parse(rawInput);

  try {
    const service = new BarberService();
    await service.removePhoto(input.id);
    return { success: true as const, url: null };
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : "Falha ao remover a foto." };
  }
}
