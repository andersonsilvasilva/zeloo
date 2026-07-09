"use server";

import { z } from "zod";
import { requirePermission, requireUserId } from "@/lib/auth/rbac";
import { PERMISSIONS } from "@/lib/auth/permissions";
import {
  AppointmentNotFoundError,
  MessageService,
  NoDefaultTemplateError,
  TemplateNotFoundError,
} from "@/modules/messages/services/message.service";

const schema = z.object({ appointmentId: z.string().cuid() });

/** Botão manual "Enviar confirmação" — exige messages.send, diferente do envio automático ao criar o agendamento. */
export async function sendAppointmentConfirmationAction(rawInput: { appointmentId: string }) {
  const userId = await requireUserId();
  await requirePermission(PERMISSIONS.messages.send);

  const { appointmentId } = schema.parse(rawInput);

  try {
    const service = new MessageService();
    const log = await service.sendAppointmentConfirmation(appointmentId, userId);
    return { success: true as const, log };
  } catch (error) {
    if (
      error instanceof NoDefaultTemplateError ||
      error instanceof AppointmentNotFoundError ||
      error instanceof TemplateNotFoundError
    ) {
      return { success: false as const, error: error.message };
    }
    throw error;
  }
}
