import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { headers } from "next/headers";
import { authConfig } from "@/lib/auth/auth.config";
import { AuthService } from "@/modules/auth/services/auth.service";
import { getCurrentTenant } from "@/lib/tenancy/current-tenant";
import { prisma } from "@/lib/prisma";

/**
 * Login/logout (spec §49 — "login"/"logout" na lista de ações críticas de
 * auditoria) não passam por nenhuma escrita de modelo que a extensão de
 * auditoria (audit-extension.ts) pudesse interceptar sozinha — sessão é JWT,
 * não cria linha nenhuma no banco. Registrado explicitamente aqui. `tenantId`
 * não é setado manualmente: a extensão de isolamento já injeta o tenant da
 * requisição atual em toda escrita de `AuditLog` (mesmo padrão do resto do
 * audit-extension), e login/logout sempre acontecem no host do próprio
 * tenant, então o resultado é o mesmo.
 */
async function logAuthEvent(action: "login" | "logout", userId: string | undefined) {
  if (!userId) return;
  try {
    const h = headers();
    await prisma.auditLog.create({
      data: {
        userId,
        action,
        entity: "User",
        entityId: userId,
        ipAddress: h.get("x-forwarded-for") ?? h.get("x-real-ip"),
        userAgent: h.get("user-agent"),
      },
    });
  } catch (error) {
    console.error(`Falha ao registrar audit log de ${action}:`, error);
  }
}

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
  events: {
    async signIn({ user }) {
      await logAuthEvent("login", user.id);
    },
    async signOut(message) {
      const userId = "token" in message ? (message.token?.id as string | undefined) : undefined;
      await logAuthEvent("logout", userId);
    },
  },
});
