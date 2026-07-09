"use server";

import { hasPermission, requirePermission, requireUserId } from "@/lib/auth/rbac";
import { PERMISSIONS } from "@/lib/auth/permissions";
import {
  periodReportFiltersSchema,
  type PeriodReportFiltersInput,
} from "@/modules/reports/schemas/period-report.schema";
import { PeriodReportService } from "@/modules/reports/services/period-report.service";

export async function getPeriodReportAction(rawInput: PeriodReportFiltersInput) {
  const userId = await requireUserId();
  await requirePermission(PERMISSIONS.reports.view);

  const input = periodReportFiltersSchema.parse(rawInput);
  const canViewFinance = await hasPermission(PERMISSIONS.finance.view);

  const service = new PeriodReportService();
  return service.getReport(input, { userId, canViewFinance });
}
