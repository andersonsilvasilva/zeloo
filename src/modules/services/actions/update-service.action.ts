"use server";

import { revalidatePath } from "next/cache";
import { requirePermission, requireUserId } from "@/lib/auth/rbac";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { updateServiceSchema, type UpdateServiceInput } from "@/modules/services/schemas/service.schema";
import { ServiceNotFoundError, ServiceService } from "@/modules/services/services/service.service";

export async function updateServiceAction(rawInput: UpdateServiceInput) {
  await requireUserId();
  await requirePermission(PERMISSIONS.services.update);

  const input = updateServiceSchema.parse(rawInput);

  try {
    const service = new ServiceService();
    const updated = await service.update(input);
    revalidatePath("/", "layout");
    return { success: true as const, service: updated };
  } catch (error) {
    if (error instanceof ServiceNotFoundError) {
      return { success: false as const, error: error.message };
    }
    throw error;
  }
}
