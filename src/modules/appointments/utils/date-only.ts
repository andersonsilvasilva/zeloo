/**
 * `Appointment.appointmentDate` é uma coluna `@db.Date` (sem componente de hora).
 * O Prisma normaliza esse campo para meia-noite UTC na escrita e na leitura —
 * construir/formatar esses valores com `Date` em horário local causa
 * deslocamento de dia em fusos != UTC (ex.: meia-noite local em UTC-4 vira
 * 20h do dia anterior em UTC). Use sempre estes helpers para esse campo;
 * `startTime`/`endTime` são instantes reais e devem continuar em horário local.
 */

export function parseDateOnly(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

export function formatDateOnly(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function formatDateOnlyBR(date: Date): string {
  const [year, month, day] = formatDateOnly(date).split("-");
  return `${day}/${month}/${year}`;
}
