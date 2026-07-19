"use server";

import { requirePermission, requireTenantId, requireUserId } from "@/lib/auth/rbac";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { changeUserPasswordSchema, type ChangeUserPasswordInput } from "@/modules/users/schemas/user.schema";
import { UserNotFoundError, UserService } from "@/modules/users/services/user.service";

export async function changeUserPasswordAction(rawInput: ChangeUserPasswordInput) {
  await requireUserId();
  await requirePermission(PERMISSIONS.users.update);
  const tenantId = await requireTenantId();

  const input = changeUserPasswordSchema.parse(rawInput);

  try {
    const service = new UserService();
    await service.changePassword(input, tenantId);
    return { success: true as const };
  } catch (error) {
    if (error instanceof UserNotFoundError) {
      return { success: false as const, error: error.message };
    }
    throw error;
  }
}
