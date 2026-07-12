"use server";

import { revalidatePath } from "next/cache";
import { requirePermission, requireUserId } from "@/lib/auth/rbac";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { professionalIdSchema, type ProfessionalIdInput } from "@/modules/professionals/schemas/professional.schema";
import {
  ProfessionalHasAppointmentsError,
  ProfessionalNotFoundError,
  ProfessionalService,
} from "@/modules/professionals/services/professional.service";

export async function deleteProfessionalAction(rawInput: ProfessionalIdInput) {
  await requireUserId();
  await requirePermission(PERMISSIONS.professionals.delete);

  const input = professionalIdSchema.parse(rawInput);

  try {
    const service = new ProfessionalService();
    await service.delete(input.id);
    revalidatePath("/", "layout");
    return { success: true as const };
  } catch (error) {
    if (error instanceof ProfessionalHasAppointmentsError || error instanceof ProfessionalNotFoundError) {
      return { success: false as const, error: error.message };
    }
    throw error;
  }
}
