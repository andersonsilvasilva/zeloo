import "server-only";
import { cache } from "react";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { TenancyRepository } from "@/modules/tenancy/repositories/tenancy.repository";
import { TENANT_SLUG_HEADER, TENANT_CONTEXT_HEADER } from "@/lib/tenancy/headers";

/**
 * Lê o tenant resolvido pelo middleware (header `x-tenant-slug`, injetado em
 * middleware.ts) e busca o registro completo — com cache por request (React
 * `cache`), mesmo padrão de `getSessionPermissions()` em src/lib/auth/rbac.ts.
 *
 * Nenhuma rota real chama isso ainda nesta fase (Fase 2) — é infraestrutura,
 * o wiring em páginas/actions de verdade é Fase 4/5.
 */

export { TENANT_SLUG_HEADER, TENANT_CONTEXT_HEADER };

export const getCurrentTenantSlug = cache((): string | null => {
  return headers().get(TENANT_SLUG_HEADER);
});

export const getCurrentTenantContext = cache((): string | null => {
  return headers().get(TENANT_CONTEXT_HEADER);
});

export const getCurrentTenant = cache(async () => {
  const slug = getCurrentTenantSlug();
  if (!slug) return null;

  const repo = new TenancyRepository();
  return repo.findTenantBySlug(slug);
});

export class TenantUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TenantUnavailableError";
  }
}

/**
 * Guarda pra rotas tenant-owned: 404 se o tenant não existe, redireciona pra
 * página de indisponibilidade se suspenso/cancelado (spec §18). Nunca cai no
 * primeiro tenant encontrado — se não houver slug no header, é 404 também.
 */
export async function requireCurrentTenant() {
  const tenant = await getCurrentTenant();
  if (!tenant) notFound();

  if (tenant.status === "SUSPENDED" || tenant.status === "CANCELLED") {
    redirect("/tenant-indisponivel");
  }

  return tenant;
}
