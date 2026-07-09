"use server";

import { requirePermission, requireUserId } from "@/lib/auth/rbac";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { FinanceService } from "@/modules/finance/services/finance.service";

export async function listPayableAppointmentsAction() {
  await requireUserId();
  await requirePermission(PERMISSIONS.finance.view);

  const service = new FinanceService();
  return service.listPayableAppointments();
}
