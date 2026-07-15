"use server";

import { requirePermission, requireUserId } from "@/lib/auth/rbac";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { monthlyClosingReportSchema, type MonthlyClosingReportInput } from "@/modules/accounts/schemas/account.schema";
import { AccountService } from "@/modules/accounts/services/account.service";

export async function getMonthlyClosingReportAction(rawInput: MonthlyClosingReportInput) {
  await requireUserId();
  // Fechamento mensal cruza Pagar+Receber — exige ver os dois lados.
  await requirePermission(PERMISSIONS.payables.view);
  await requirePermission(PERMISSIONS.receivables.view);

  const input = monthlyClosingReportSchema.parse(rawInput);
  const service = new AccountService();
  return service.getMonthlyClosingReport(input.month);
}
