import { z } from "zod";

export const identifyClientSchema = z
  .object({
    name: z.string().trim().min(1, "Informe seu nome.").max(200),
    phone: z.string().trim().min(8, "Informe um telefone válido.").max(30),
    wantsAccount: z.boolean().default(false),
    email: z.string().trim().email("E-mail inválido.").optional().or(z.literal("")),
    password: z.string().min(6, "A senha deve ter ao menos 6 caracteres.").max(100).optional().or(z.literal("")),
  })
  .refine((data) => !data.wantsAccount || Boolean(data.email), {
    message: "Informe um e-mail para criar sua conta.",
    path: ["email"],
  })
  .refine((data) => !data.wantsAccount || Boolean(data.password), {
    message: "Informe uma senha para criar sua conta.",
    path: ["password"],
  });

export type IdentifyClientInput = z.infer<typeof identifyClientSchema>;

export const publicAvailableSlotsSchema = z.object({
  barberId: z.string().cuid(),
  serviceIds: z.array(z.string().cuid()).min(1, "Selecione ao menos um serviço."),
  date: z.coerce.date(),
});

export type PublicAvailableSlotsInput = z.infer<typeof publicAvailableSlotsSchema>;

export const createPublicAppointmentSchema = z.object({
  clientId: z.string().cuid(),
  phone: z.string().trim().min(8).max(30),
  barberId: z.string().cuid(),
  serviceIds: z.array(z.string().cuid()).min(1, "Selecione ao menos um serviço."),
  appointmentDate: z.coerce.date(),
  startTime: z.coerce.date(),
  notes: z.string().max(1000).optional(),
});

export type CreatePublicAppointmentInput = z.infer<typeof createPublicAppointmentSchema>;
