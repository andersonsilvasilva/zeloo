"use server";

import { z } from "zod";
import { AppointmentService, AppointmentNotFoundError } from "@/modules/appointments/services/appointment.service";

const schema = z.object({ id: z.string().cuid() });

/**
 * Rota pública `/agendar/sucesso` — sem checagem de sessão/permissão de propósito.
 * O id do agendamento (cuid) não é adivinhável e só é visto pelo próprio cliente
 * logo após confirmar (mesmo nível de exposição aceito no resto do módulo booking).
 */
export async function getPublicAppointmentSummaryAction(rawInput: { id: string }) {
  const { id } = schema.parse(rawInput);

  try {
    const service = new AppointmentService();
    const appointment = await service.getById(id);
    return { success: true as const, appointment };
  } catch (error) {
    if (error instanceof AppointmentNotFoundError) {
      return { success: false as const, error: error.message };
    }
    throw error;
  }
}
