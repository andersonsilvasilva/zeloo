"use server";

import { requirePermission, requireUserId } from "@/lib/auth/rbac";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { serviceIdSchema, type ServiceIdInput } from "@/modules/services/schemas/service.schema";
import {
  ServiceInUseError,
  ServiceNotFoundError,
  ServiceService,
} from "@/modules/services/services/service.service";

export async function deleteServiceAction(rawInput: ServiceIdInput) {
  await requireUserId();
  await requirePermission(PERMISSIONS.services.delete);

  const input = serviceIdSchema.parse(rawInput);

  try {
    const service = new ServiceService();
    await service.delete(input.id);
    return { success: true as const };
  } catch (error) {
    if (error instanceof ServiceInUseError || error instanceof ServiceNotFoundError) {
      return { success: false as const, error: error.message };
    }
    throw error;
  }
}
