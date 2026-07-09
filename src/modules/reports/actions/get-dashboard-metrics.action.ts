"use server";

import { requireUserId, requirePermission } from "@/lib/auth/rbac";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { DashboardService } from "@/modules/reports/services/dashboard.service";

export async function getDashboardMetricsAction() {
  await requireUserId();
  await requirePermission(PERMISSIONS.reports.view);

  const service = new DashboardService();
  return service.getMetrics();
}
