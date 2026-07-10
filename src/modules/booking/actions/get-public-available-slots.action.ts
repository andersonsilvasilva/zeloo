"use server";

import { publicAvailableSlotsSchema, type PublicAvailableSlotsInput } from "@/modules/booking/schemas/booking.schema";
import { AppointmentService } from "@/modules/appointments/services/appointment.service";

/**
 * Rota pública `/agendar` — sem checagem de sessão/permissão de propósito.
 * Só expõe quais horários estão livres/ocupados, nada sensível (ver plano do módulo booking).
 */
export async function getPublicAvailableSlotsAction(rawInput: PublicAvailableSlotsInput) {
  const input = publicAvailableSlotsSchema.parse(rawInput);

  const service = new AppointmentService();
  return service.getAvailableSlots(input);
}
