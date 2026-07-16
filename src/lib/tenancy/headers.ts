/**
 * Nomes dos headers usados pra passar o tenant resolvido do middleware
 * (Edge Runtime) pro código Node-side (src/lib/tenancy/current-tenant.ts).
 * Arquivo sem dependências de propósito — importado tanto por middleware.ts
 * (bundle Edge, não pode arrastar Prisma/Node) quanto por current-tenant.ts.
 */
export const TENANT_SLUG_HEADER = "x-tenant-slug";
export const TENANT_CONTEXT_HEADER = "x-tenant-context"; // "root" | "central" | "tenant" | "invalid"
