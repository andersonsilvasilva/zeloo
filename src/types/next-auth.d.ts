import type { DefaultSession } from "next-auth";

/**
 * Claims de tenant na sessão/JWT — Fase 5 (CLAUDE_CODE_MULTI_TENANT_ZELOO.md §32).
 * `tenantId` é validado contra o tenant resolvido pelo hostname a cada
 * requisição em app/(app)/layout.tsx — divergência desloga.
 */
declare module "next-auth" {
  interface User {
    tenantId?: string;
    tenantSlug?: string;
  }

  interface Session {
    user: {
      id: string;
      tenantId: string;
      tenantSlug: string;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    tenantId?: string;
    tenantSlug?: string;
  }
}
