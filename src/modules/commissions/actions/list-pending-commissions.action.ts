"use server";

import { hasPermission, requirePermission, requireUserId } from "@/lib/auth/rbac";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { findProfessionalIdByUserId } from "@/modules/reports/repositories/period-report.repository";
import {
  commissionPeriodFiltersSchema,
  type CommissionPeriodFiltersInput,
} from "@/modules/commissions/schemas/commission.schema";
import { CommissionService } from "@/modules/commissions/services/commission.service";

export async function listPendingCommissionsAction(rawInput: CommissionPeriodFiltersInput) {
  const userId = await requireUserId();
  await requirePermission(PERMISSIONS.commissions.view);
  const input = commissionPeriodFiltersSchema.parse(rawInput);

  // Quem não pode fechar (ex.: PROFESSIONAL) só vê a própria comissão — mesma
  // regra já aplicada em /relatorios (ver period-report.service.ts).
  const canSeeAll = await hasPermission(PERMISSIONS.commissions.close);
  let onlyProfessionalId: string | undefined;
  if (!canSeeAll) {
    const professional = await findProfessionalIdByUserId(userId);
    if (!professional) return [];
    onlyProfessionalId = professional.id;
  }

  const service = new CommissionService();
  return service.listPending(input.periodStart, input.periodEnd, onlyProfessionalId);
}
