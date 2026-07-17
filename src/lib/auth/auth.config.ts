import type { NextAuthConfig } from "next-auth";
import { headers } from "next/headers";

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
    /**
     * Multi-tenant por subdomínio (Fase 2): sem isso, o NextAuth resolve
     * `redirectTo` relativo (ex.: `signOut({ redirectTo: "/login" })`)
     * contra `AUTH_URL` fixo — sempre volta pro mesmo host configurado
     * (`localhost:3000` em dev, `zeloo.net` em produção), nunca pro
     * subdomínio do tenant onde o usuário realmente estava
     * (`flora.zeloo.net`, `diagro.zeloo.net`...). Resolve contra o host
     * real da requisição atual em vez de `baseUrl`. `headers()` funciona
     * aqui porque esse callback só roda no runtime Node (rota
     * `/api/auth/[...nextauth]`), nunca no middleware Edge.
     */
    async redirect({ url, baseUrl }) {
      const host = headers().get("host");
      const protocol = process.env.NODE_ENV === "production" ? "https" : "http";
      const currentOrigin = host ? `${protocol}://${host}` : baseUrl;

      if (url.startsWith("/")) return `${currentOrigin}${url}`;
      try {
        if (new URL(url).origin === currentOrigin) return url;
      } catch {
        // url relativa sem "/" na frente ou inválida — cai no fallback abaixo
      }
      return currentOrigin;
    },
  },
} satisfies NextAuthConfig;
