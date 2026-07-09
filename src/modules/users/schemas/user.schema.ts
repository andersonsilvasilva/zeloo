import { z } from "zod";

export const userStatusValues = ["ACTIVE", "INACTIVE", "SUSPENDED"] as const;
export const userStatusSchema = z.enum(userStatusValues);
export type UserStatus = z.infer<typeof userStatusSchema>;

const passwordSchema = z
  .string()
  .min(8, "A senha deve ter ao menos 8 caracteres.")
  .max(72, "A senha deve ter no máximo 72 caracteres.");

export const createUserSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome.").max(200),
  email: z.string().trim().min(1, "Informe o e-mail.").email("E-mail inválido."),
  password: passwordSchema,
  phone: z.string().trim().max(30).optional().default(""),
  status: userStatusSchema.default("ACTIVE"),
  roleIds: z.array(z.string().cuid()).min(1, "Selecione ao menos um papel."),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;

export const updateUserSchema = z.object({
  id: z.string().cuid(),
  name: z.string().trim().min(1, "Informe o nome.").max(200),
  email: z.string().trim().min(1, "Informe o e-mail.").email("E-mail inválido."),
  phone: z.string().trim().max(30).optional().default(""),
  status: userStatusSchema,
  roleIds: z.array(z.string().cuid()).min(1, "Selecione ao menos um papel."),
});

export type UpdateUserInput = z.infer<typeof updateUserSchema>;

export const changeUserPasswordSchema = z.object({
  id: z.string().cuid(),
  password: passwordSchema,
});

export type ChangeUserPasswordInput = z.infer<typeof changeUserPasswordSchema>;

export const userIdSchema = z.object({ id: z.string().cuid() });
export type UserIdInput = z.infer<typeof userIdSchema>;

export const listUsersSchema = z.object({
  search: z.string().trim().max(200).optional(),
  status: userStatusSchema.optional(),
  roleId: z.string().cuid().optional(),
});

export type ListUsersInput = z.infer<typeof listUsersSchema>;
