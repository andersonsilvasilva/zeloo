"use server";

import { requirePermission, requireUserId } from "@/lib/auth/rbac";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { createPixChargeSchema, type CreatePixChargeInput } from "@/modules/finance/schemas/finance.schema";
import {
  AppointmentNotFoundError,
  AppointmentNotPayableError,
  FinanceService,
  MercadoPagoNotConfiguredError,
  NoOpenCashRegisterError,
} from "@/modules/finance/services/finance.service";
import { MercadoPagoError } from "@/lib/mercadopago/mercadopago-client";

export async function createPixChargeAction(rawInput: CreatePixChargeInput) {
  const userId = await requireUserId();
  await requirePermission(PERMISSIONS.finance.create);

  const input = createPixChargeSchema.parse(rawInput);

  try {
    const service = new FinanceService();
    const charge = await service.createPixCharge(input, userId);
    return { success: true as const, charge };
  } catch (error) {
    if (
      error instanceof NoOpenCashRegisterError ||
      error instanceof AppointmentNotFoundError ||
      error instanceof AppointmentNotPayableError ||
      error instanceof MercadoPagoNotConfiguredError ||
      error instanceof MercadoPagoError
    ) {
      return { success: false as const, error: error.message };
    }
    throw error;
  }
}
