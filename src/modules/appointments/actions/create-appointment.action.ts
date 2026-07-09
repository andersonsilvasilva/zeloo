"use server";

import { requirePermission, requireUserId } from "@/lib/auth/rbac";
import { PERMISSIONS } from "@/lib/auth/permissions";
import {
  createAppointmentSchema,
  type CreateAppointmentInput,
} from "@/modules/appointments/schemas/appointment.schema";
import { AppointmentConflictError, AppointmentService } from "@/modules/appointments/services/appointment.service";
import { autoSendAppointmentConfirmationAction } from "@/modules/messages/actions/auto-send-appointment-confirmation.action";

/**
 * Camada de Action: única porta de entrada a partir da UI.
 * 1) valida sessão  2) valida permissão  3) valida payload (Zod)  4) chama service
 */
export async function createAppointmentAction(rawInput: CreateAppointmentInput) {
  const userId = await requireUserId();
  await requirePermission(PERMISSIONS.appointments.create);

  const input = createAppointmentSchema.parse(rawInput);

  try {
    const service = new AppointmentService();
    const appointment = await service.create(input, userId);

    // Envio automático da confirmação (best-effort): não deve travar a criação do
    // agendamento — a ausência de um modelo padrão configurado é o caso comum, não um erro.
    const confirmation = await autoSendAppointmentConfirmationAction({ appointmentId: appointment.id }).catch(
      () => ({ success: false as const }),
    );

    // Retorna apenas o id — o registro completo tem campos Decimal (preço),
    // que não podem cruzar a fronteira serializável da Server Action.
    return { success: true as const, appointmentId: appointment.id, confirmationSent: confirmation.success };
  } catch (error) {
    if (error instanceof AppointmentConflictError) {
      return { success: false as const, error: error.message };
    }
    throw error;
  }
}
