import { NextResponse, type NextRequest } from "next/server";
import { resolveTenantHostname, resolveRequestHost } from "@/lib/tenancy/hostname";
import { TENANT_SLUG_HEADER, TENANT_CONTEXT_HEADER } from "@/lib/tenancy/headers";

/**
 * Tenant Resolver (Fase 2 — CLAUDE_CODE_MULTI_TENANT_ZELOO.md §15).
 *
 * Histórico importante — por que isso ficou desligado (`matcher: []`) até
 * 2026-07-16: `NextResponse.redirect()` dentro do middleware, na hospedagem
 * compartilhada antiga (Next.js standalone via Passenger), acionava um bug
 * conhecido do Next.js — o servidor tentava um self-fetch interno em
 * `http://0.0.0.0:<porta>` pra resolver o redirect, endereço que o Passenger
 * não expõe. Travava login e Server Actions (visto em produção em
 * 2026-07-10). A app migrou pra VPS dedicada com Nginx em 2026-07-13 — não
 * há evidência de que o bug ainda se aplique atrás do Nginx, mas por
 * segurança este middleware **nunca chama `NextResponse.redirect()`**,
 * mesmo assim: só `NextResponse.next()` (com headers) ou uma `Response` de
 * erro direta (400/404), nunca um redirect. Isso evita reintroduzir o mesmo
 * padrão de falha independentemente de o bug do Passenger ainda valer aqui.
 *
 * O controle de acesso por autenticação continua em `app/(app)/layout.tsx`
 * via `redirect()` do `next/navigation` (mecanismo Node-side, sem esse
 * problema) — este middleware não mexe nisso, só resolve o tenant a partir
 * do hostname e injeta o resultado em headers pra uso Node-side
 * (`src/lib/tenancy/current-tenant.ts`). Nenhuma rota real ainda lê esses
 * headers nesta fase — isso é Fase 4/5.
 *
 * Sem lookup no banco aqui: Prisma com `engineType = "binary"` (ver
 * prisma/schema.prisma) não roda no Edge Runtime, onde o middleware executa.
 * A validação de existência/status do tenant é Node-side, em
 * `requireCurrentTenant()`.
 */

function parseCentralDomains(raw: string | undefined): string[] {
  return (raw ?? "")
    .split(",")
    .map((d) => d.trim().toLowerCase())
    .filter(Boolean);
}

export function middleware(request: NextRequest) {
  const baseDomain = (process.env.APP_BASE_DOMAIN ?? "").toLowerCase();
  const trustProxy = process.env.TRUST_PROXY === "true";
  const centralDomains = parseCentralDomains(process.env.CENTRAL_DOMAINS);
  const rootTenantSlug = process.env.ROOT_TENANT_SLUG ?? "";

  const host = resolveRequestHost(request.headers.get("host"), request.headers.get("x-forwarded-host"), trustProxy);

  if (!baseDomain) {
    // APP_BASE_DOMAIN não configurado — não adivinha, deixa passar sem
    // contexto de tenant (equivalente a app single-tenant, comportamento
    // atual, pra não quebrar ambientes que ainda não migraram pra Fase 2).
    return NextResponse.next();
  }

  // Dev local (npm run dev, curl/browser em localhost/127.0.0.1 sem Host
  // spoofado): trata como domínio raiz, senão NENHUMA rota funciona sem
  // ficar forjando o header Host o tempo todo. Nunca em produção
  // (NODE_ENV=production) — lá o hostname real sempre bate com
  // APP_BASE_DOMAIN/CENTRAL_DOMAINS de verdade.
  const isDevLocalhost = process.env.NODE_ENV !== "production" && (host === "localhost" || host === "127.0.0.1");

  const resolution = isDevLocalhost ? ({ kind: "root" } as const) : resolveTenantHostname({ host, baseDomain, centralDomains });

  if (resolution.kind === "invalid") {
    return NextResponse.json({ error: "Hostname inválido." }, { status: 400 });
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(TENANT_CONTEXT_HEADER, resolution.kind);

  if (resolution.kind === "root") {
    requestHeaders.set(TENANT_SLUG_HEADER, rootTenantSlug);
  } else if (resolution.kind === "tenant") {
    requestHeaders.set(TENANT_SLUG_HEADER, resolution.slug);
  } else {
    requestHeaders.delete(TENANT_SLUG_HEADER);
  }

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|apple-icon.png|icon.png).*)"],
};
