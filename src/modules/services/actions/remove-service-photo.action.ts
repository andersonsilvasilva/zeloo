"use server";

import { revalidatePath } from "next/cache";
import { requirePermission, requireUserId } from "@/lib/auth/rbac";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { serviceIdSchema, type ServiceIdInput } from "@/modules/services/schemas/service.schema";
import { ServiceService } from "@/modules/services/services/service.service";

export async function removeServicePhotoAction(rawInput: ServiceIdInput) {
  await requireUserId();
  await requirePermission(PERMISSIONS.services.update);

  const input = serviceIdSchema.parse(rawInput);

  try {
    const service = new ServiceService();
    await service.removePhoto(input.id);
    revalidatePath("/", "layout");
    return { success: true as const, url: null };
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : "Falha ao remover a imagem." };
  }
}
