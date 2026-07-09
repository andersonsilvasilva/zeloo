"use server";

import { requirePermission, requireUserId } from "@/lib/auth/rbac";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { listServicesSchema, type ListServicesInput } from "@/modules/services/schemas/service.schema";
import { ServiceService } from "@/modules/services/services/service.service";

export async function listServicesAction(rawInput: ListServicesInput) {
  await requireUserId();
  await requirePermission(PERMISSIONS.services.view);

  const input = listServicesSchema.parse(rawInput);

  const service = new ServiceService();
  return service.list(input);
}
