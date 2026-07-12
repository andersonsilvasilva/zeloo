"use server";

import { requirePermission, requireUserId } from "@/lib/auth/rbac";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { professionalIdSchema, type ProfessionalIdInput } from "@/modules/professionals/schemas/professional.schema";
import { ProfessionalService } from "@/modules/professionals/services/professional.service";

export async function getProfessionalAction(rawInput: ProfessionalIdInput) {
  await requireUserId();
  await requirePermission(PERMISSIONS.professionals.view);

  const input = professionalIdSchema.parse(rawInput);

  const service = new ProfessionalService();
  return service.getById(input.id);
}
