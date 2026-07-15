"use server";

import { requirePermission, requireUserId } from "@/lib/auth/rbac";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { accountDirectionSchema, type AccountDirection } from "@/modules/accounts/schemas/account.schema";
import { AccountService } from "@/modules/accounts/services/account.service";

export async function getAccountSummaryAction(rawDirection: AccountDirection) {
  await requireUserId();
  const direction = accountDirectionSchema.parse(rawDirection);
  await requirePermission(direction === "PAYABLE" ? PERMISSIONS.payables.view : PERMISSIONS.receivables.view);

  const service = new AccountService();
  return service.summarize(direction);
}
