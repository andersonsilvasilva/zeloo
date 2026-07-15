/**
 * Para colunas `@db.Date` (sem componente de hora) — ex.: `AccountEntry.dueDate`,
 * `CommissionClosing.periodStart/periodEnd`. O Prisma normaliza esses campos pra
 * meia-noite UTC na escrita e na leitura — construir/formatar com `Date` em
 * horário local causa deslocamento de dia em fusos != UTC (ex.: meia-noite UTC
 * em UTC-3 é 21h do dia anterior local). Mesmo padrão já usado em
 * `src/modules/appointments/utils/date-only.ts` pra `Appointment.appointmentDate`.
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
