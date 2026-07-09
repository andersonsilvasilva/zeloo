import { z } from "zod";

export const barberStatusValues = ["ACTIVE", "INACTIVE", "VACATION"] as const;
export const barberStatusSchema = z.enum(barberStatusValues);
export type BarberStatus = z.infer<typeof barberStatusSchema>;

/** Chaves de dia da semana usadas em Barber.workingHours (mesma convenção do módulo appointments). */
export const WEEKDAY_KEYS = ["seg", "ter", "qua", "qui", "sex", "sab", "dom"] as const;

const timeRangeSchema = z
  .string()
  .regex(/^\d{2}:\d{2}-\d{2}:\d{2}$/, "Use o formato HH:MM-HH:MM.");

const weekdayRangesSchema = z.array(timeRangeSchema).default([]);

export const workingHoursSchema = z.object({
  seg: weekdayRangesSchema,
  ter: weekdayRangesSchema,
  qua: weekdayRangesSchema,
  qui: weekdayRangesSchema,
  sex: weekdayRangesSchema,
  sab: weekdayRangesSchema,
  dom: weekdayRangesSchema,
});

export type WorkingHoursInput = z.infer<typeof workingHoursSchema>;

export const createBarberSchema = z.object({
  fullName: z.string().trim().min(1, "Informe o nome completo.").max(200),
  professionalName: z.string().trim().min(1, "Informe o nome profissional.").max(100),
  bio: z.string().trim().max(1000).optional().default(""),
  specialties: z.string().trim().max(300).optional().default(""),
  phone: z.string().trim().max(30).optional().default(""),
  whatsapp: z.string().trim().max(30).optional().default(""),
  email: z
    .string()
    .trim()
    .max(200)
    .optional()
    .default("")
    .refine((v) => v === "" || z.string().email().safeParse(v).success, { message: "E-mail inválido." }),
  hiredAt: z.coerce.date().optional().nullable(),
  status: barberStatusSchema.default("ACTIVE"),
  commissionPercentage: z.coerce.number().min(0, "Mínimo 0%.").max(100, "Máximo 100%.").default(0),
  workingHours: workingHoursSchema.default({}),
  serviceIds: z.array(z.string().cuid()).default([]),
});

export type CreateBarberInput = z.infer<typeof createBarberSchema>;

export const updateBarberSchema = createBarberSchema.extend({ id: z.string().cuid() });
export type UpdateBarberInput = z.infer<typeof updateBarberSchema>;

export const barberIdSchema = z.object({ id: z.string().cuid() });
export type BarberIdInput = z.infer<typeof barberIdSchema>;

export const listBarbersSchema = z.object({
  search: z.string().trim().max(200).optional(),
  status: barberStatusSchema.optional(),
});

export type ListBarbersInput = z.infer<typeof listBarbersSchema>;
