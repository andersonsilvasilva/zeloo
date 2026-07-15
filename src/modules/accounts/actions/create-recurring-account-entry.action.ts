"use server";

import { revalidatePath } from "next/cache";
import { requirePermission, requireUserId } from "@/lib/auth/rbac";
import { PERMISSIONS } from "@/lib/auth/permissions";
import {
  createRecurringAccountEntrySchema,
  type CreateRecurringAccountEntryInput,
} from "@/modules/accounts/schemas/account.schema";
import { AccountService } from "@/modules/accounts/services/account.service";

export async function createRecurringAccountEntryAction(rawInput: CreateRecurringAccountEntryInput) {
  const userId = await requireUserId();
  const input = createRecurringAccountEntrySchema.parse(rawInput);
  await requirePermission(input.direction === "PAYABLE" ? PERMISSIONS.payables.create : PERMISSIONS.receivables.create);

  const service = new AccountService();
  const entry = await service.createRecurring(input, userId);
  revalidatePath(input.direction === "PAYABLE" ? "/contas-a-pagar" : "/contas-a-receber");
  return { success: true as const, entry };
}
