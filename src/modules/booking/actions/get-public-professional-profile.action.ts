"use server";

import { z } from "zod";
import { ProfessionalNotFoundError, BookingService } from "@/modules/booking/services/booking.service";

const professionalIdSchema = z.string().cuid();

/** Rota pública `/agendar/profissional` — sem checagem de sessão/permissão de propósito. */
export async function getPublicProfessionalProfileAction(rawProfessionalId: string) {
  const professionalId = professionalIdSchema.parse(rawProfessionalId);

  try {
    const service = new BookingService();
    const profile = await service.getProfessionalProfile(professionalId);
    return { success: true as const, profile };
  } catch (error) {
    if (error instanceof ProfessionalNotFoundError) {
      return { success: false as const, error: error.message };
    }
    throw error;
  }
}
