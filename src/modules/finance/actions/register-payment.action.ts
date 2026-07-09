"use server";

import { requirePermission, requireUserId } from "@/lib/auth/rbac";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { registerPaymentSchema, type RegisterPaymentInput } from "@/modules/finance/schemas/finance.schema";
import {
  AppointmentNotFoundError,
  AppointmentNotPayableError,
  FinanceService,
  NoOpenCashRegisterError,
} from "@/modules/finance/services/finance.service";

export async function registerPaymentAction(rawInput: RegisterPaymentInput) {
  const userId = await requireUserId();
  await requirePermission(PERMISSIONS.finance.create);

  const input = registerPaymentSchema.parse(rawInput);

  try {
    const service = new FinanceService();
    const entry = await service.registerPayment(input, userId);
    return { success: true as const, entry };
  } catch (error) {
    if (
      error instanceof NoOpenCashRegisterError ||
      error instanceof AppointmentNotFoundError ||
      error instanceof AppointmentNotPayableError
    ) {
      return { success: false as const, error: error.message };
    }
    throw error;
  }
}
