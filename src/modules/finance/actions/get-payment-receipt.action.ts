"use server";

import { z } from "zod";
import { requirePermission, requireUserId } from "@/lib/auth/rbac";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { FinanceService, PaymentNotFoundError } from "@/modules/finance/services/finance.service";

const idSchema = z.string().cuid();

export async function getPaymentReceiptAction(rawId: string) {
  await requireUserId();
  await requirePermission(PERMISSIONS.finance.view);

  const id = idSchema.parse(rawId);

  try {
    const service = new FinanceService();
    const receipt = await service.getPaymentReceipt(id);
    return { success: true as const, receipt };
  } catch (error) {
    if (error instanceof PaymentNotFoundError) {
      return { success: false as const, error: error.message };
    }
    throw error;
  }
}
