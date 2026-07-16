import { NextResponse } from "next/server";
import { getCurrentTenant, getCurrentTenantContext, getCurrentTenantSlug } from "@/lib/tenancy/current-tenant";

/**
 * Rota de diagnóstico da Fase 2 (Tenant Resolver) — mostra o que o
 * middleware resolveu pra este hostname e o registro de Tenant encontrado
 * (se houver). Só pra verificação local nesta fase; **sem autenticação —
 * não deployar em produção sem gate antes** (nenhuma rota real usa isso
 * ainda, então não é alcançável de fora do ambiente local hoje).
 */
export async function GET() {
  const context = getCurrentTenantContext();
  const slug = getCurrentTenantSlug();
  const tenant = await getCurrentTenant();

  return NextResponse.json({
    context,
    slug,
    tenant: tenant
      ? { id: tenant.id, name: tenant.name, slug: tenant.slug, status: tenant.status }
      : null,
  });
}
