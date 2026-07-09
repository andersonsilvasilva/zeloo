"use server";

import { requirePermission, requireUserId } from "@/lib/auth/rbac";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { barberIdSchema, type BarberIdInput } from "@/modules/barbers/schemas/barber.schema";
import {
  BarberHasAppointmentsError,
  BarberNotFoundError,
  BarberService,
} from "@/modules/barbers/services/barber.service";

export async function deleteBarberAction(rawInput: BarberIdInput) {
  await requireUserId();
  await requirePermission(PERMISSIONS.barbers.delete);

  const input = barberIdSchema.parse(rawInput);

  try {
    const service = new BarberService();
    await service.delete(input.id);
    return { success: true as const };
  } catch (error) {
    if (error instanceof BarberHasAppointmentsError || error instanceof BarberNotFoundError) {
      return { success: false as const, error: error.message };
    }
    throw error;
  }
}
