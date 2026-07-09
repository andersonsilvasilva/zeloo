"use server";

import { requirePermission, requireUserId } from "@/lib/auth/rbac";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { openCashRegisterSchema, type OpenCashRegisterInput } from "@/modules/finance/schemas/finance.schema";
import { CashRegisterAlreadyOpenError, FinanceService } from "@/modules/finance/services/finance.service";

export async function openCashRegisterAction(rawInput: OpenCashRegisterInput) {
  const userId = await requireUserId();
  await requirePermission(PERMISSIONS.finance.create);

  const input = openCashRegisterSchema.parse(rawInput);

  try {
    const service = new FinanceService();
    const register = await service.openRegister(input, userId);
    return { success: true as const, register };
  } catch (error) {
    if (error instanceof CashRegisterAlreadyOpenError) {
      return { success: false as const, error: error.message };
    }
    throw error;
  }
}
