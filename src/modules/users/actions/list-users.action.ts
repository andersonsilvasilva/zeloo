"use server";

import { requirePermission, requireUserId } from "@/lib/auth/rbac";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { listUsersSchema, type ListUsersInput } from "@/modules/users/schemas/user.schema";
import { UserService } from "@/modules/users/services/user.service";

export async function listUsersAction(rawInput: ListUsersInput) {
  await requireUserId();
  await requirePermission(PERMISSIONS.users.view);

  const input = listUsersSchema.parse(rawInput);

  const service = new UserService();
  return service.list(input);
}
