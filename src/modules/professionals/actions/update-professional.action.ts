"use server";

import { revalidatePath } from "next/cache";
import { requirePermission, requireUserId } from "@/lib/auth/rbac";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { updateProfessionalSchema, type UpdateProfessionalInput } from "@/modules/professionals/schemas/professional.schema";
import { ProfessionalNotFoundError, ProfessionalService } from "@/modules/professionals/services/professional.service";

export async function updateProfessionalAction(rawInput: UpdateProfessionalInput) {
  await requireUserId();
  await requirePermission(PERMISSIONS.professionals.update);

  const input = updateProfessionalSchema.parse(rawInput);

  try {
    const service = new ProfessionalService();
    const professional = await service.update(input);
    revalidatePath("/", "layout");
    return { success: true as const, professional };
  } catch (error) {
    if (error instanceof ProfessionalNotFoundError) {
      return { success: false as const, error: error.message };
    }
    throw error;
  }
}
