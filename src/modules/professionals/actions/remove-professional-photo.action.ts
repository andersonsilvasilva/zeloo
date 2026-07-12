"use server";

import { revalidatePath } from "next/cache";
import { requirePermission, requireUserId } from "@/lib/auth/rbac";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { professionalIdSchema, type ProfessionalIdInput } from "@/modules/professionals/schemas/professional.schema";
import { ProfessionalService } from "@/modules/professionals/services/professional.service";

export async function removeProfessionalPhotoAction(rawInput: ProfessionalIdInput) {
  await requireUserId();
  await requirePermission(PERMISSIONS.professionals.update);

  const input = professionalIdSchema.parse(rawInput);

  try {
    const service = new ProfessionalService();
    await service.removePhoto(input.id);
    revalidatePath("/", "layout");
    return { success: true as const, url: null };
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : "Falha ao remover a foto." };
  }
}
