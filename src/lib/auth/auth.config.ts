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
      if (user) token.id = user.id;
      return token;
    },
    async session({ session, token }) {
      if (session.user) session.user.id = token.id as string;
      return session;
    },
  },
} satisfies NextAuthConfig;
