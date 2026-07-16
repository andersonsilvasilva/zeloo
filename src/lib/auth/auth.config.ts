import type { NextAuthConfig } from "next-auth";

/**
 * Configuração "edge-safe": sem providers que dependam de Prisma/bcrypt
 * (Node-only), para poder ser usada pelo middleware (Edge Runtime) apenas
 * para ler/validar o JWT de sessão. A configuração completa, com o
 * provider Credentials, vive em `auth.ts`.
 */
export const authConfig = {
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [],
  callbacks: {
    async jwt({ token, user }) {
      // `user` só vem preenchido no momento do login (authorize() em auth.ts)
      // — é aí que tenantId/tenantSlug entram no token, uma única vez por
      // sessão. Trocar de tenant exige logar de novo no subdomínio certo.
      if (user) {
        token.id = user.id;
        token.tenantId = user.tenantId;
        token.tenantSlug = user.tenantSlug;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.tenantId = token.tenantId as string;
        session.user.tenantSlug = token.tenantSlug as string;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
