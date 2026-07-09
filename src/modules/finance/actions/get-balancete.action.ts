"use server";

import { requirePermission, requireUserId } from "@/lib/auth/rbac";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { balanceteFiltersSchema, type BalanceteFiltersInput } from "@/modules/finance/schemas/finance.schema";
import { FinanceService } from "@/modules/finance/services/finance.service";

export async function getBalanceteAction(rawInput: BalanceteFiltersInput) {
  await requireUserId();
  await requirePermission(PERMISSIONS.finance.view);

  const input = balanceteFiltersSchema.parse(rawInput);

  const service = new FinanceService();
  return service.getBalancete(input);
}
