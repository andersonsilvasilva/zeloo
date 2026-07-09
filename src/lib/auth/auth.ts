import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { authConfig } from "@/lib/auth/auth.config";
import { AuthService } from "@/modules/auth/services/auth.service";

/**
 * Configuração completa do Auth.js (Node runtime). Usada pelas Server
 * Actions, pelo route handler e pelo rbac.ts. O middleware (Edge Runtime)
 * usa apenas `authConfig`, que não depende de Prisma/bcrypt.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: "E-mail", type: "email" },
        password: { label: "Senha", type: "password" },
      },
      authorize: async (credentials) => {
        if (!credentials?.email || !credentials?.password) return null;

        const authService = new AuthService();
        return authService.validateCredentials(
          String(credentials.email),
          String(credentials.password),
        );
      },
    }),
  ],
});
