"use server";

import { requirePermission, requireUserId } from "@/lib/auth/rbac";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { createUserSchema, type CreateUserInput } from "@/modules/users/schemas/user.schema";
import { EmailAlreadyExistsError, UserService } from "@/modules/users/services/user.service";

export async function createUserAction(rawInput: CreateUserInput) {
  await requireUserId();
  await requirePermission(PERMISSIONS.users.create);

  const input = createUserSchema.parse(rawInput);

  try {
    const service = new UserService();
    const user = await service.create(input);
    return { success: true as const, user };
  } catch (error) {
    if (error instanceof EmailAlreadyExistsError) {
      return { success: false as const, error: error.message };
    }
    throw error;
  }
}
