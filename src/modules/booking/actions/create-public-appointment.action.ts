"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth/auth";
import {
  createPublicAppointmentSchema,
  type CreatePublicAppointmentInput,
} from "@/modules/booking/schemas/booking.schema";
import {
  BookingService,
  ClientNotFoundError,
  ClientProfileMissingError,
  PhoneMismatchError,
} from "@/modules/booking/services/booking.service";
import { AppointmentConflictError } from "@/modules/appointments/services/appointment.service";

/**
 * Rota pública `/agendar` — não exige sessão (fluxo sem conta é válido), mas
 * quando existe sessão ela sempre prevalece sobre o clientId enviado pelo
 * formulário (ver `BookingService.createAppointmentForBooking`).
 */
export async function createPublicAppointmentAction(rawInput: CreatePublicAppointmentInput) {
  const input = createPublicAppointmentSchema.parse(rawInput);
  const session = await auth();

  try {
    const service = new BookingService();
    const result = await service.createAppointmentForBooking(input, session?.user?.id ?? null);
    revalidatePath("/");
    revalidatePath("/agenda");
    return { success: true as const, ...result };
  } catch (error) {
    if (
      error instanceof ClientNotFoundError ||
      error instanceof PhoneMismatchError ||
      error instanceof ClientProfileMissingError ||
      error instanceof AppointmentConflictError
    ) {
      return { success: false as const, error: error.message };
    }
    throw error;
  }
}
