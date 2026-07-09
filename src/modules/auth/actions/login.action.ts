"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/lib/auth/auth";
import { loginSchema, type LoginInput } from "@/modules/auth/schemas/login.schema";

/**
 * Camada de Action: única porta de entrada a partir da UI.
 * 1) valida payload (Zod)  2) delega ao Auth.js (que chama o Credentials
 * provider -> AuthService -> repository)
 */
export async function loginAction(rawInput: LoginInput) {
  const input = loginSchema.parse(rawInput);

  try {
    await signIn("credentials", {
      email: input.email,
      password: input.password,
      redirect: false,
    });
    return { success: true as const };
  } catch (error) {
    if (error instanceof AuthError) {
      return { success: false as const, error: "E-mail ou senha inválidos." };
    }
    throw error;
  }
}
