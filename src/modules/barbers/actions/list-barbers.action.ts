"use server";

import { requirePermission, requireUserId } from "@/lib/auth/rbac";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { listBarbersSchema, type ListBarbersInput } from "@/modules/barbers/schemas/barber.schema";
import { BarberService } from "@/modules/barbers/services/barber.service";

export async function listBarbersAction(rawInput: ListBarbersInput) {
  await requireUserId();
  await requirePermission(PERMISSIONS.barbers.view);

  const input = listBarbersSchema.parse(rawInput);

  const service = new BarberService();
  return service.list(input);
}
