"use server";

import { requirePermission, requireUserId } from "@/lib/auth/rbac";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { closeCashRegisterSchema, type CloseCashRegisterInput } from "@/modules/finance/schemas/finance.schema";
import { FinanceService, NoOpenCashRegisterError } from "@/modules/finance/services/finance.service";

export async function closeCashRegisterAction(rawInput: CloseCashRegisterInput) {
  const userId = await requireUserId();
  await requirePermission(PERMISSIONS.finance.update);

  const input = closeCashRegisterSchema.parse(rawInput);

  try {
    const service = new FinanceService();
    const summary = await service.closeRegister(input, userId);
    return { success: true as const, summary };
  } catch (error) {
    if (error instanceof NoOpenCashRegisterError) {
      return { success: false as const, error: error.message };
    }
    throw error;
  }
}
