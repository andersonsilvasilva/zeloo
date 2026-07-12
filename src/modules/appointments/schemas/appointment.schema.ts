import { z } from "zod";

/** Schema compartilhado entre frontend (React Hook Form) e backend (Server Action). */
export const createAppointmentSchema = z.object({
  clientId: z.string().cuid(),
  professionalId: z.string().cuid(),
  appointmentDate: z.coerce.date(),
  startTime: z.coerce.date(),
  serviceIds: z.array(z.string().cuid()).min(1, "Selecione ao menos um serviço."),
  notes: z.string().max(1000).optional(),
});

export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;

/** Reagendamento: mesmos dados de criação + id do agendamento existente. */
export const rescheduleAppointmentSchema = createAppointmentSchema.extend({
  id: z.string().cuid(),
});

export type RescheduleAppointmentInput = z.infer<typeof rescheduleAppointmentSchema>;

export const appointmentStatusValues = [
  "PENDING",
  "CONFIRMED",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
  "NO_SHOW",
] as const;

export const appointmentStatusSchema = z.enum(appointmentStatusValues);

export type AppointmentStatus = z.infer<typeof appointmentStatusSchema>;

export const updateAppointmentStatusSchema = z.object({
  id: z.string().cuid(),
  status: appointmentStatusSchema,
});

export type UpdateAppointmentStatusInput = z.infer<typeof updateAppointmentStatusSchema>;

export const appointmentIdSchema = z.object({
  id: z.string().cuid(),
});

export type AppointmentIdInput = z.infer<typeof appointmentIdSchema>;

export const listAppointmentsSchema = z.object({
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  professionalId: z.string().cuid().optional(),
  clientId: z.string().cuid().optional(),
  status: appointmentStatusSchema.optional(),
});

export type ListAppointmentsInput = z.infer<typeof listAppointmentsSchema>;

export const getAvailableSlotsSchema = z.object({
  professionalId: z.string().cuid(),
  serviceIds: z.array(z.string().cuid()).min(1, "Selecione ao menos um serviço."),
  date: z.coerce.date(),
  /** Ao reagendar, ignora o conflito do próprio agendamento sendo editado. */
  excludeAppointmentId: z.string().cuid().optional(),
});

export type GetAvailableSlotsInput = z.infer<typeof getAvailableSlotsSchema>;
