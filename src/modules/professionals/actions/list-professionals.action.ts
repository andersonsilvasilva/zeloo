"use server";

import { requirePermission, requireUserId } from "@/lib/auth/rbac";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { listProfessionalsSchema, type ListProfessionalsInput } from "@/modules/professionals/schemas/professional.schema";
import { ProfessionalService } from "@/modules/professionals/services/professional.service";

export async function listProfessionalsAction(rawInput: ListProfessionalsInput) {
  await requireUserId();
  await requirePermission(PERMISSIONS.professionals.view);

  const input = listProfessionalsSchema.parse(rawInput);

  const service = new ProfessionalService();
  return service.list(input);
}
