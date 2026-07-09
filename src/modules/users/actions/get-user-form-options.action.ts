"use server";

import { requirePermission, requireUserId } from "@/lib/auth/rbac";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { UserService } from "@/modules/users/services/user.service";

export async function getUserFormOptionsAction() {
  await requireUserId();
  await requirePermission(PERMISSIONS.users.view);

  const service = new UserService();
  return service.getFormOptions();
}
