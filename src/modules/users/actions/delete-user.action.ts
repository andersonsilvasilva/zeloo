"use server";

import { revalidatePath } from "next/cache";
import { requirePermission, requireTenantId, requireUserId } from "@/lib/auth/rbac";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { userIdSchema, type UserIdInput } from "@/modules/users/schemas/user.schema";
import { CannotDeleteSelfError, UserNotFoundError, UserService } from "@/modules/users/services/user.service";

/** Remove o vínculo da conta com este tenant — restrita ao Administrador. */
export async function deleteUserAction(rawInput: UserIdInput) {
  const currentUserId = await requireUserId();
  await requirePermission(PERMISSIONS.users.delete);
  const tenantId = await requireTenantId();

  const input = userIdSchema.parse(rawInput);

  try {
    const service = new UserService();
    await service.delete(input.id, currentUserId, tenantId);
    revalidatePath("/usuarios");
    return { success: true as const };
  } catch (error) {
    if (error instanceof UserNotFoundError || error instanceof CannotDeleteSelfError) {
      return { success: false as const, error: error.message };
    }
    throw error;
  }
}
