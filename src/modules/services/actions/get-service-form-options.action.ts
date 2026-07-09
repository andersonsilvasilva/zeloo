"use server";

import { requirePermission, requireUserId } from "@/lib/auth/rbac";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { ServiceService } from "@/modules/services/services/service.service";

export async function getServiceFormOptionsAction() {
  await requireUserId();
  await requirePermission(PERMISSIONS.services.view);

  const service = new ServiceService();
  return service.getFormOptions();
}
