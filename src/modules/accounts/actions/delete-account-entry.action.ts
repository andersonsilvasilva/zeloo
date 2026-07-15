"use server";

import { revalidatePath } from "next/cache";
import { requirePermission, requireUserId } from "@/lib/auth/rbac";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { deleteAccountEntrySchema, type DeleteAccountEntryInput } from "@/modules/accounts/schemas/account.schema";
import {
  AccountEntryNotFoundError,
  AccountEntrySettledCannotDeleteError,
  AccountService,
} from "@/modules/accounts/services/account.service";

export async function deleteAccountEntryAction(rawInput: DeleteAccountEntryInput) {
  await requireUserId();
  const input = deleteAccountEntrySchema.parse(rawInput);
  await requirePermission(input.direction === "PAYABLE" ? PERMISSIONS.payables.delete : PERMISSIONS.receivables.delete);

  try {
    const service = new AccountService();
    await service.delete(input.id);
    revalidatePath(input.direction === "PAYABLE" ? "/contas-a-pagar" : "/contas-a-receber");
    return { success: true as const };
  } catch (error) {
    if (error instanceof AccountEntryNotFoundError || error instanceof AccountEntrySettledCannotDeleteError) {
      return { success: false as const, error: error.message };
    }
    throw error;
  }
}
