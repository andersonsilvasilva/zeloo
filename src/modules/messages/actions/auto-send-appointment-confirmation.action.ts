"use server";

import { z } from "zod";
import { requireUserId } from "@/lib/auth/rbac";
import { MessageService } from "@/modules/messages/services/message.service";

const schema = z.object({ appointmentId: z.string().cuid() });

/**
 * Chamada internamente por createAppointmentAction logo após criar o agendamento.
 * Não exige `messages.send` — é um efeito automático do próprio `appointments.create`
 * (já validado por quem chamou), não uma ação de mensageria escolhida pelo usuário.
 * Falha silenciosamente (retorna success:false) quando não há modelo padrão configurado,
 * já que isso é o caso comum, não um erro real.
 */
export async function autoSendAppointmentConfirmationAction(rawInput: { appointmentId: string }) {
  const userId = await requireUserId();
  const { appointmentId } = schema.parse(rawInput);

  try {
    const service = new MessageService();
    const log = await service.sendAppointmentConfirmation(appointmentId, userId);
    return { success: true as const, log };
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : "Falha ao enviar confirmação." };
  }
}
