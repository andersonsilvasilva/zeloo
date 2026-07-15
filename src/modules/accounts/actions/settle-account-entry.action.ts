"use server";

import { revalidatePath } from "next/cache";
import { requirePermission, requireUserId } from "@/lib/auth/rbac";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { settleAccountEntrySchema, type SettleAccountEntryInput } from "@/modules/accounts/schemas/account.schema";
import {
  AccountEntryNotFoundError,
  AccountEntryNotPendingError,
  AccountService,
  NoOpenCashRegisterError,
} from "@/modules/accounts/services/account.service";

export async function settleAccountEntryAction(rawInput: SettleAccountEntryInput) {
  const userId = await requireUserId();
  const input = settleAccountEntrySchema.parse(rawInput);
  await requirePermission(input.direction === "PAYABLE" ? PERMISSIONS.payables.update : PERMISSIONS.receivables.update);

  try {
    const service = new AccountService();
    const entry = await service.settle(input, userId);
    revalidatePath(input.direction === "PAYABLE" ? "/contas-a-pagar" : "/contas-a-receber");
    revalidatePath("/financeiro");
    revalidatePath("/financeiro/balancete");
    revalidatePath("/financeiro/fechamento-mensal");
    return { success: true as const, entry };
  } catch (error) {
    if (
      error instanceof NoOpenCashRegisterError ||
      error instanceof AccountEntryNotFoundError ||
      error instanceof AccountEntryNotPendingError
    ) {
      return { success: false as const, error: error.message };
    }
    throw error;
  }
}
