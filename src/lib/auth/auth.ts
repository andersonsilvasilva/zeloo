import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { authConfig } from "@/lib/auth/auth.config";
import { AuthService } from "@/modules/auth/services/auth.service";
import { getCurrentTenant } from "@/lib/tenancy/current-tenant";

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
      /**
       * Login por tenant (Fase 5, spec §29): o tenant vem do hostname da
       * própria requisição de login (`getCurrentTenant()`, resolvido pelo
       * middleware — Fase 2), nunca de um campo do formulário. Sem tenant
       * resolvido ou tenant suspenso/cancelado, nega antes mesmo de checar
       * a senha.
       */
      authorize: async (credentials) => {
        if (!credentials?.email || !credentials?.password) return null;

        const tenant = await getCurrentTenant();
        if (!tenant) return null;
        if (tenant.status !== "ACTIVE" && tenant.status !== "TRIAL") return null;

        const authService = new AuthService();
        const user = await authService.validateCredentials(
          String(credentials.email),
          String(credentials.password),
          tenant.id,
        );
        if (!user) return null;

        return { ...user, tenantId: tenant.id, tenantSlug: tenant.slug };
      },
    }),
  ],
});
