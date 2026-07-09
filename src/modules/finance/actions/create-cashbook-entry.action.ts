"use server";

import { requirePermission, requireUserId } from "@/lib/auth/rbac";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { createCashbookEntrySchema, type CreateCashbookEntryInput } from "@/modules/finance/schemas/finance.schema";
import { FinanceService, NoOpenCashRegisterError } from "@/modules/finance/services/finance.service";

export async function createCashbookEntryAction(rawInput: CreateCashbookEntryInput) {
  const userId = await requireUserId();
  await requirePermission(PERMISSIONS.finance.create);

  const input = createCashbookEntrySchema.parse(rawInput);

  try {
    const service = new FinanceService();
    const entry = await service.createCashbookEntry(input, userId);
    return { success: true as const, entry };
  } catch (error) {
    if (error instanceof NoOpenCashRegisterError) {
      return { success: false as const, error: error.message };
    }
    throw error;
  }
}
