"use server";

import { z } from "zod";
import { BarberNotFoundError, BookingService } from "@/modules/booking/services/booking.service";

const barberIdSchema = z.string().cuid();

/** Rota pública `/agendar/profissional` — sem checagem de sessão/permissão de propósito. */
export async function getPublicBarberProfileAction(rawBarberId: string) {
  const barberId = barberIdSchema.parse(rawBarberId);

  try {
    const service = new BookingService();
    const profile = await service.getBarberProfile(barberId);
    return { success: true as const, profile };
  } catch (error) {
    if (error instanceof BarberNotFoundError) {
      return { success: false as const, error: error.message };
    }
    throw error;
  }
}
