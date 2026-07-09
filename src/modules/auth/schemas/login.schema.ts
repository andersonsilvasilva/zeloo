import { z } from "zod";

/** Schema compartilhado entre frontend (React Hook Form) e backend (Server Action). */
export const loginSchema = z.object({
  email: z.string().email("E-mail inválido."),
  password: z.string().min(1, "Informe a senha."),
});

export type LoginInput = z.infer<typeof loginSchema>;
