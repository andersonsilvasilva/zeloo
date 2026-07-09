import { z } from "zod";

export const serviceStatusValues = ["ACTIVE", "INACTIVE"] as const;
export const serviceStatusSchema = z.enum(serviceStatusValues);
export type ServiceStatus = z.infer<typeof serviceStatusSchema>;

export const createServiceSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome do serviço.").max(200),
  shortDescription: z.string().trim().max(300).optional().default(""),
  description: z.string().trim().max(2000).optional().default(""),
  price: z.coerce.number().positive("O preço deve ser maior que zero."),
  durationMinutes: z.coerce.number().int("Use um número inteiro de minutos.").positive("Informe a duração."),
  category: z.string().trim().max(100).optional().default(""),
  status: serviceStatusSchema.default("ACTIVE"),
  /** Modelo de mensagem enviado (manual ou automaticamente) ao agendar este serviço. */
  defaultMessageTemplateId: z.string().cuid().optional().nullable(),
});

export type CreateServiceInput = z.infer<typeof createServiceSchema>;

export const updateServiceSchema = createServiceSchema.extend({ id: z.string().cuid() });
export type UpdateServiceInput = z.infer<typeof updateServiceSchema>;

export const serviceIdSchema = z.object({ id: z.string().cuid() });
export type ServiceIdInput = z.infer<typeof serviceIdSchema>;

export const listServicesSchema = z.object({
  search: z.string().trim().max(200).optional(),
  status: serviceStatusSchema.optional(),
  category: z.string().trim().max(100).optional(),
});

export type ListServicesInput = z.infer<typeof listServicesSchema>;
