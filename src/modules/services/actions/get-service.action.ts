"use server";

import { requirePermission, requireUserId } from "@/lib/auth/rbac";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { serviceIdSchema, type ServiceIdInput } from "@/modules/services/schemas/service.schema";
import { ServiceService } from "@/modules/services/services/service.service";

export async function getServiceAction(rawInput: ServiceIdInput) {
  await requireUserId();
  await requirePermission(PERMISSIONS.services.view);

  const input = serviceIdSchema.parse(rawInput);

  const service = new ServiceService();
  return service.getById(input.id);
}
