"use server";

import { requirePermission, requireUserId } from "@/lib/auth/rbac";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { listAccountEntriesSchema, type ListAccountEntriesInput } from "@/modules/accounts/schemas/account.schema";
import { AccountService } from "@/modules/accounts/services/account.service";

export async function listAccountEntriesAction(rawInput: ListAccountEntriesInput) {
  await requireUserId();
  const input = listAccountEntriesSchema.parse(rawInput);
  await requirePermission(input.direction === "PAYABLE" ? PERMISSIONS.payables.view : PERMISSIONS.receivables.view);

  const service = new AccountService();
  return service.list(input);
}
