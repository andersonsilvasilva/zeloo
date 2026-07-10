"use server";

import { identifyClientSchema, type IdentifyClientInput } from "@/modules/booking/schemas/booking.schema";
import { BookingService, EmailAlreadyExistsError } from "@/modules/booking/services/booking.service";

/** Rota pública `/agendar` — sem checagem de sessão/permissão de propósito. */
export async function identifyClientAction(rawInput: IdentifyClientInput) {
  const input = identifyClientSchema.parse(rawInput);

  try {
    const service = new BookingService();
    const result = await service.identifyClient(input);
    return { success: true as const, ...result };
  } catch (error) {
    if (error instanceof EmailAlreadyExistsError) {
      return { success: false as const, error: error.message };
    }
    throw error;
  }
}
