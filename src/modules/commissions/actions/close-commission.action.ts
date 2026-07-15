"use server";

import { revalidatePath } from "next/cache";
import { requirePermission, requireUserId } from "@/lib/auth/rbac";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { closeCommissionSchema, type CloseCommissionInput } from "@/modules/commissions/schemas/commission.schema";
import {
  CommissionAlreadyClosedError,
  CommissionService,
  NoOpenCashRegisterError,
  ProfessionalNotFoundError,
} from "@/modules/commissions/services/commission.service";

export async function closeCommissionAction(rawInput: CloseCommissionInput) {
  const userId = await requireUserId();
  await requirePermission(PERMISSIONS.commissions.close);
  const input = closeCommissionSchema.parse(rawInput);

  try {
    const service = new CommissionService();
    const closing = await service.closeCommission(input, userId);
    revalidatePath("/comissoes");
    revalidatePath("/financeiro");
    revalidatePath("/financeiro/balancete");
    return { success: true as const, closing };
  } catch (error) {
    if (
      error instanceof NoOpenCashRegisterError ||
      error instanceof ProfessionalNotFoundError ||
      error instanceof CommissionAlreadyClosedError
    ) {
      return { success: false as const, error: error.message };
    }
    throw error;
  }
}
