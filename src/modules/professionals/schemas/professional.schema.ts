import { z } from "zod";

export const professionalStatusValues = ["ACTIVE", "INACTIVE", "VACATION"] as const;
export const professionalStatusSchema = z.enum(professionalStatusValues);
export type ProfessionalStatus = z.infer<typeof professionalStatusSchema>;

/** Chaves de dia da semana usadas em Professional.workingHours (mesma convenção do módulo appointments). */
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

export const createProfessionalSchema = z.object({
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
  status: professionalStatusSchema.default("ACTIVE"),
  commissionPercentage: z.coerce.number().min(0, "Mínimo 0%.").max(100, "Máximo 100%.").default(0),
  workingHours: workingHoursSchema.default({}),
  serviceIds: z.array(z.string().cuid()).default([]),
});

export type CreateProfessionalInput = z.infer<typeof createProfessionalSchema>;

export const updateProfessionalSchema = createProfessionalSchema.extend({ id: z.string().cuid() });
export type UpdateProfessionalInput = z.infer<typeof updateProfessionalSchema>;

export const professionalIdSchema = z.object({ id: z.string().cuid() });
export type ProfessionalIdInput = z.infer<typeof professionalIdSchema>;

export const listProfessionalsSchema = z.object({
  search: z.string().trim().max(200).optional(),
  status: professionalStatusSchema.optional(),
});

export type ListProfessionalsInput = z.infer<typeof listProfessionalsSchema>;
