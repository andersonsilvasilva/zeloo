"use server";

import { requirePermission, requireTenantId, requireUserId } from "@/lib/auth/rbac";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { updateUserSchema, type UpdateUserInput } from "@/modules/users/schemas/user.schema";
import {
  CannotModifySelfStatusError,
  EmailAlreadyExistsError,
  UserNotFoundError,
  UserService,
} from "@/modules/users/services/user.service";

export async function updateUserAction(rawInput: UpdateUserInput) {
  const currentUserId = await requireUserId();
  await requirePermission(PERMISSIONS.users.update);
  const tenantId = await requireTenantId();

  const input = updateUserSchema.parse(rawInput);

  try {
    const service = new UserService();
    const user = await service.update(input, currentUserId, tenantId);
    return { success: true as const, user };
  } catch (error) {
    if (
      error instanceof EmailAlreadyExistsError ||
      error instanceof UserNotFoundError ||
      error instanceof CannotModifySelfStatusError
    ) {
      return { success: false as const, error: error.message };
    }
    throw error;
  }
}
