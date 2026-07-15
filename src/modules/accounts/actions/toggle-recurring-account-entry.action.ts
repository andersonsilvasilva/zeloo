"use server";

import { revalidatePath } from "next/cache";
import { requirePermission, requireUserId } from "@/lib/auth/rbac";
import { PERMISSIONS } from "@/lib/auth/permissions";
import {
  toggleRecurringAccountEntrySchema,
  type ToggleRecurringAccountEntryInput,
  accountDirectionSchema,
  type AccountDirection,
} from "@/modules/accounts/schemas/account.schema";
import { AccountService } from "@/modules/accounts/services/account.service";

const inputSchema = toggleRecurringAccountEntrySchema.extend({ direction: accountDirectionSchema });

export async function toggleRecurringAccountEntryAction(
  rawInput: ToggleRecurringAccountEntryInput & { direction: AccountDirection },
) {
  await requireUserId();
  const input = inputSchema.parse(rawInput);
  await requirePermission(input.direction === "PAYABLE" ? PERMISSIONS.payables.update : PERMISSIONS.receivables.update);

  const service = new AccountService();
  await service.toggleRecurring(input.id, input.active);
  revalidatePath(input.direction === "PAYABLE" ? "/contas-a-pagar" : "/contas-a-receber");
  return { success: true as const };
}
