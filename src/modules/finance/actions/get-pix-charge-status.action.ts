"use server";

import { z } from "zod";
import { requirePermission, requireUserId } from "@/lib/auth/rbac";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { FinanceService, PixChargeNotFoundError } from "@/modules/finance/services/finance.service";

const idSchema = z.string().cuid();

/** Usada pelo polling da tela enquanto o QR code Pix está aberto. */
export async function getPixChargeStatusAction(rawId: string) {
  await requireUserId();
  await requirePermission(PERMISSIONS.finance.view);

  const id = idSchema.parse(rawId);

  try {
    const service = new FinanceService();
    const charge = await service.getPixChargeStatus(id);
    return { success: true as const, charge };
  } catch (error) {
    if (error instanceof PixChargeNotFoundError) {
      return { success: false as const, error: error.message };
    }
    throw error;
  }
}
