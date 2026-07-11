"use server";

import { findExistingClientSchema, type FindExistingClientInput } from "@/modules/booking/schemas/booking.schema";
import { BookingRepository } from "@/modules/booking/repositories/booking.repository";

/**
 * Rota pública `/agendar` — checa se já existe cliente cadastrado com esse
 * telefone, pra mostrar na tela e o visitante confirmar antes de continuar
 * (em vez de criar/reaproveitar o cadastro silenciosamente). Retorna só o
 * nome — nada mais do cadastro é exposto por essa checagem.
 */
export async function findExistingClientAction(rawInput: FindExistingClientInput) {
  const input = findExistingClientSchema.parse(rawInput);

  const repo = new BookingRepository();
  const existing = await repo.findClientByPhone(input.phone);

  return { found: Boolean(existing), name: existing?.name ?? null };
}
