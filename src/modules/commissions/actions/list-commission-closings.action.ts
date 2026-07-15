"use server";

import { hasPermission, requirePermission, requireUserId } from "@/lib/auth/rbac";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { findProfessionalIdByUserId } from "@/modules/reports/repositories/period-report.repository";
import { CommissionService } from "@/modules/commissions/services/commission.service";

export async function listCommissionClosingsAction() {
  const userId = await requireUserId();
  await requirePermission(PERMISSIONS.commissions.view);

  const canSeeAll = await hasPermission(PERMISSIONS.commissions.close);
  let onlyProfessionalId: string | undefined;
  if (!canSeeAll) {
    const professional = await findProfessionalIdByUserId(userId);
    if (!professional) return [];
    onlyProfessionalId = professional.id;
  }

  const service = new CommissionService();
  return service.listClosings(onlyProfessionalId);
}
