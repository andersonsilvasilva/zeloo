"use server";

import { revalidatePath } from "next/cache";
import { requirePermission, requireUserId } from "@/lib/auth/rbac";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { registerPaymentSchema, type RegisterPaymentInput } from "@/modules/finance/schemas/finance.schema";
import {
  AppointmentNotFoundError,
  AppointmentNotPayableError,
  FinanceService,
  NoOpenCashRegisterError,
} from "@/modules/finance/services/finance.service";

export async function registerPaymentAction(rawInput: RegisterPaymentInput) {
  const userId = await requireUserId();
  await requirePermission(PERMISSIONS.finance.create);

  const input = registerPaymentSchema.parse(rawInput);

  try {
    const service = new FinanceService();
    const { entry, paymentId } = await service.registerPayment(input, userId);
    // Pagamento fecha o pedido e muda o faturamento — invalida o cache de
    // navegação do dashboard e dos relatórios, senão ficam com dados velhos
    // até o Router Cache expirar sozinho (ver nota em update-appointment-status.action.ts).
    revalidatePath("/");
    revalidatePath("/relatorios");
    revalidatePath("/agenda");
    return { success: true as const, entry, paymentId };
  } catch (error) {
    if (
      error instanceof NoOpenCashRegisterError ||
      error instanceof AppointmentNotFoundError ||
      error instanceof AppointmentNotPayableError
    ) {
      return { success: false as const, error: error.message };
    }
    throw error;
  }
}
