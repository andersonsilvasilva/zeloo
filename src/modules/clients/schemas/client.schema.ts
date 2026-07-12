import { z } from "zod";

export const clientStatusValues = ["ACTIVE", "INACTIVE", "VIP"] as const;
export const clientStatusSchema = z.enum(clientStatusValues);
export type ClientStatus = z.infer<typeof clientStatusSchema>;

export const createClientSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome do cliente.").max(200),
  phone: z.string().trim().max(30).optional().default(""),
  whatsapp: z.string().trim().max(30).optional().default(""),
  email: z
    .string()
    .trim()
    .max(200)
    .optional()
    .default("")
    .refine((v) => v === "" || z.string().email().safeParse(v).success, { message: "E-mail inválido." }),
  birthDate: z.coerce.date().optional().nullable(),
  notes: z.string().trim().max(1000).optional().default(""),
  preferredProfessionalId: z.string().cuid().optional().nullable(),
  status: clientStatusSchema.default("ACTIVE"),
});

export type CreateClientInput = z.infer<typeof createClientSchema>;

export const updateClientSchema = createClientSchema.extend({ id: z.string().cuid() });
export type UpdateClientInput = z.infer<typeof updateClientSchema>;

export const clientIdSchema = z.object({ id: z.string().cuid() });
export type ClientIdInput = z.infer<typeof clientIdSchema>;

export const listClientsSchema = z.object({
  search: z.string().trim().max(200).optional(),
  status: clientStatusSchema.optional(),
  preferredProfessionalId: z.string().cuid().optional(),
});

export type ListClientsInput = z.infer<typeof listClientsSchema>;
