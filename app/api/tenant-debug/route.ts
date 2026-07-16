import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentTenant, getCurrentTenantContext, getCurrentTenantSlug } from "@/lib/tenancy/current-tenant";

/**
 * Rota de diagnóstico da Fase 2/4 — mostra o que o middleware resolveu pra
 * este hostname, o registro de Tenant encontrado, e (Fase 4) uma prova viva
 * do isolamento: lista clientes usando o Prisma Client normal da app (já
 * com `tenantExtension` aplicada) — só deve aparecer o que pertence ao
 * tenant resolvido, nunca de outro. Só pra verificação local; **sem
 * autenticação — não deployar em produção sem gate antes**.
 */
export async function GET(request: Request) {
  const context = getCurrentTenantContext();
  const slug = getCurrentTenantSlug();
  const tenant = await getCurrentTenant();

  let clients: { id: string; name: string }[] = [];
  let clientCount: number | null = null;
  let isolationError: string | null = null;
  try {
    clientCount = await prisma.client.count();
    clients = await prisma.client.findMany({ take: 5, select: { id: true, name: true }, orderBy: { name: "asc" } });
  } catch (e) {
    isolationError = e instanceof Error ? e.constructor.name : String(e);
  }

  // Teste de IDOR: ?probeClientId=<id> tenta ler e escrever um cliente por ID
  // direto, mesmo que ele pertença a outro tenant — usado só pra verificação
  // de isolamento na Fase 4, ver docs/tenancy/03-query-isolation.md.
  const probeClientId = new URL(request.url).searchParams.get("probeClientId");
  let probe: { foundViaFindUnique: boolean; updateAffected: number } | null = null;
  if (probeClientId) {
    const found = await prisma.client.findUnique({ where: { id: probeClientId } }).catch(() => null);
    const updateResult = await prisma.client.updateMany({
      where: { id: probeClientId },
      data: { notes: "probe-isolation-test" },
    });
    probe = { foundViaFindUnique: Boolean(found), updateAffected: updateResult.count };
  }

  return NextResponse.json({
    context,
    slug,
    tenant: tenant
      ? { id: tenant.id, name: tenant.name, slug: tenant.slug, status: tenant.status }
      : null,
    clientCount,
    clientsSample: clients,
    isolationError,
    probe,
  });
}
