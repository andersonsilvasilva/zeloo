import { formatInTimeZone, fromZonedTime } from "date-fns-tz";

/**
 * O servidor de produção roda em UTC, mas os horários de expediente/agendamento
 * são sempre pensados na hora local da barbearia (`Setting["barbershop.timezone"]`).
 * Construir/formatar `Date` com `setHours`/`format` ambíguos (que usam o fuso do
 * ambiente onde o código roda) causa deslocamento — ex.: "09:00" configurado pelo
 * profissional vira 09:00 UTC = 05:00 em America/Cuiaba (UTC-4) na hora de mostrar pro
 * cliente. Use sempre estes helpers para qualquer `Date` que represente um horário
 * de agendamento (não confundir com `appointmentDate`, que é `@db.Date` e já tem
 * seu próprio utilitário em `date-only.ts`).
 */

/** Combina uma data (meia-noite) + "HH:mm" interpretados no fuso da barbearia, retorna o instante UTC correto. */
export function zonedDateAndTimeToUtc(date: Date, time: string, timezone: string): Date {
  const [hours, minutes] = time.split(":").map(Number);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  const hh = String(hours).padStart(2, "0");
  const mm = String(minutes).padStart(2, "0");
  return fromZonedTime(`${year}-${month}-${day}T${hh}:${mm}:00`, timezone);
}

/** Início do dia (00:00) de `date` no fuso da barbearia, como instante UTC. */
export function startOfZonedDay(date: Date, timezone: string): Date {
  return zonedDateAndTimeToUtc(date, "00:00", timezone);
}

/** "Hoje" no fuso da barbearia, como `Date` de meia-noite UTC (mesma convenção de `parseDateOnly`). */
export function todayInTimezone(timezone: string): Date {
  const todayStr = formatInTimeZone(new Date(), timezone, "yyyy-MM-dd");
  const [year, month, day] = todayStr.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

/** Formata um instante (`Date`) na hora local da barbearia — nunca no fuso ambiente do servidor/navegador. */
export function formatInBarbershopTz(date: Date, timezone: string, fmt: string): string {
  return formatInTimeZone(date, timezone, fmt);
}
