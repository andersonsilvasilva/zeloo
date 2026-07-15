"use server";

import { revalidatePath } from "next/cache";
import { requirePermission, requireUserId } from "@/lib/auth/rbac";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { cancelAccountEntrySchema, type CancelAccountEntryInput } from "@/modules/accounts/schemas/account.schema";
import { AccountEntryNotFoundError, AccountEntryNotPendingError, AccountService } from "@/modules/accounts/services/account.service";

export async function cancelAccountEntryAction(rawInput: CancelAccountEntryInput) {
  await requireUserId();
  const input = cancelAccountEntrySchema.parse(rawInput);
  await requirePermission(input.direction === "PAYABLE" ? PERMISSIONS.payables.update : PERMISSIONS.receivables.update);

  try {
    const service = new AccountService();
    await service.cancel(input.id);
    revalidatePath(input.direction === "PAYABLE" ? "/contas-a-pagar" : "/contas-a-receber");
    return { success: true as const };
  } catch (error) {
    if (error instanceof AccountEntryNotFoundError || error instanceof AccountEntryNotPendingError) {
      return { success: false as const, error: error.message };
    }
    throw error;
  }
}
