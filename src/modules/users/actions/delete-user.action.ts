"use server";

import { revalidatePath } from "next/cache";
import { requirePermission, requireUserId } from "@/lib/auth/rbac";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { userIdSchema, type UserIdInput } from "@/modules/users/schemas/user.schema";
import { CannotDeleteSelfError, UserNotFoundError, UserService } from "@/modules/users/services/user.service";

/** Exclusão da conta de login — restrita ao Administrador. */
export async function deleteUserAction(rawInput: UserIdInput) {
  const currentUserId = await requireUserId();
  await requirePermission(PERMISSIONS.users.delete);

  const input = userIdSchema.parse(rawInput);

  try {
    const service = new UserService();
    await service.delete(input.id, currentUserId);
    revalidatePath("/usuarios");
    return { success: true as const };
  } catch (error) {
    if (error instanceof UserNotFoundError || error instanceof CannotDeleteSelfError) {
      return { success: false as const, error: error.message };
    }
    throw error;
  }
}
