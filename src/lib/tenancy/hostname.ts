/**
 * Lógica pura de resolução de tenant por hostname — sem I/O (sem Prisma, sem
 * fetch), roda tanto no middleware (Edge) quanto Node-side. Prisma com
 * `engineType = "binary"` (ver prisma/schema.prisma) NÃO roda no Edge Runtime
 * — por isso o lookup de verdade do Tenant fica em src/lib/tenancy/current-tenant.ts
 * (Node-side), chamado a partir do header que o middleware injeta.
 *
 * CLAUDE_CODE_MULTI_TENANT_ZELOO.md §15 — fluxo do Tenant Resolver.
 */

export type HostnameResolution =
  | { kind: "invalid" }
  | { kind: "root" } // domínio raiz — serve o tenant fixo de ROOT_TENANT_SLUG
  | { kind: "central"; host: string } // app./admin./api. — sem tenant, fluxo de plataforma
  | { kind: "tenant"; slug: string };

const HOSTNAME_REGEX = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)*$/;

/** Remove porta e normaliza caixa. "" pra host ausente/vazio. */
export function normalizeHost(rawHost: string | null | undefined): string {
  if (!rawHost) return "";
  return rawHost.trim().toLowerCase().split(":")[0];
}

/**
 * `X-Forwarded-Host` só é confiável quando `TRUST_PROXY=true` (proxy
 * conhecido, ex.: Nginx da VPS) — nunca por padrão (spec §15 passo 3, §60).
 */
export function resolveRequestHost(headerHost: string | null, forwardedHost: string | null, trustProxy: boolean): string {
  if (trustProxy && forwardedHost) return normalizeHost(forwardedHost);
  return normalizeHost(headerHost);
}

function isValidHostname(host: string): boolean {
  if (!host || host.length > 253) return false;
  return HOSTNAME_REGEX.test(host);
}

/** `host === base` ou `host` termina em `.base` — nunca substring solta (ver casos de ataque no §53 do spec). */
function isRootOrSubdomainOf(host: string, baseDomain: string): boolean {
  return host === baseDomain || host.endsWith(`.${baseDomain}`);
}

export interface ResolveTenantHostnameInput {
  host: string;
  baseDomain: string;
  centralDomains: string[]; // já normalizados (lowercase) — inclui o baseDomain e www., app., admin., api.
}

/**
 * Resolve o hostname pra uma das 4 categorias. Não faz lookup no banco —
 * "tenant" aqui é só o slug extraído, ainda não validado contra `Tenant` real
 * (isso é current-tenant.ts, Node-side).
 */
export function resolveTenantHostname(input: ResolveTenantHostnameInput): HostnameResolution {
  const { host, baseDomain, centralDomains } = input;

  if (!isValidHostname(host)) return { kind: "invalid" };

  const isRoot = host === baseDomain || host === `www.${baseDomain}`;
  if (isRoot) return { kind: "root" };

  if (centralDomains.includes(host)) return { kind: "central", host };

  if (!isRootOrSubdomainOf(host, baseDomain)) return { kind: "invalid" };

  const subdomain = host.slice(0, -(baseDomain.length + 1));
  // multi-label ("a.b.zeloo.net") não é slug válido — trata como inválido em
  // vez de deixar a validação de slug (que já rejeitaria "a.b" por causa do
  // ".") explodir mais adiante com um erro menos claro.
  if (!subdomain || subdomain.includes(".")) return { kind: "invalid" };

  return { kind: "tenant", slug: subdomain };
}
