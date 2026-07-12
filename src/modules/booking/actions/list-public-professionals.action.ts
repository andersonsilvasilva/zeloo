"use server";

import { BookingService } from "@/modules/booking/services/booking.service";

/** Rota pública `/agendar` — sem checagem de sessão/permissão de propósito. */
export async function listPublicProfessionalsAction() {
  const service = new BookingService();
  return service.listProfessionals();
}
