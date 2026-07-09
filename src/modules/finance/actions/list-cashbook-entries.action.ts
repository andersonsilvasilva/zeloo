"use server";

import { requirePermission, requireUserId } from "@/lib/auth/rbac";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { listCashbookEntriesSchema, type ListCashbookEntriesInput } from "@/modules/finance/schemas/finance.schema";
import { FinanceService } from "@/modules/finance/services/finance.service";

export async function listCashbookEntriesAction(rawInput: ListCashbookEntriesInput) {
  await requireUserId();
  await requirePermission(PERMISSIONS.finance.view);

  const input = listCashbookEntriesSchema.parse(rawInput);

  const service = new FinanceService();
  return service.listCashbookEntries(input);
}
