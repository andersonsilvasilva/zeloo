"use server";

import { requirePermission, requireUserId } from "@/lib/auth/rbac";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { ProfessionalService } from "@/modules/professionals/services/professional.service";

export async function getProfessionalFormOptionsAction() {
  await requireUserId();
  await requirePermission(PERMISSIONS.professionals.view);

  const service = new ProfessionalService();
  return service.getFormOptions();
}
