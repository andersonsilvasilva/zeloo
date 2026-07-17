import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Health check pra load balancer/monitoramento (spec §57/§61). `$queryRaw`
 * não passa pelas extensões de tenant/auditoria (elas só interceptam
 * operações de model via `$allModels`/`$allOperations`), então funciona sem
 * nenhum contexto de tenant resolvido — é isso que torna essa rota segura
 * de ficar pública e sem autenticação.
 *
 * `force-dynamic` é essencial aqui: sem nenhuma API dinâmica do Request
 * (searchParams/cookies/headers), o Next trata esse Route Handler como
 * estático por padrão e cacheia a resposta do build pra sempre — o
 * `$queryRaw` só rodaria uma vez, na hora do `next build`, e o endpoint
 * ficaria reportando "ok" indefinidamente mesmo com o banco fora do ar
 * (achado na verificação da Fase 14, ver docs/tenancy/13-acceptance-criteria.md).
 */
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ status: "ok" });
  } catch (error) {
    return NextResponse.json(
      { status: "error", message: error instanceof Error ? error.message : String(error) },
      { status: 503 },
    );
  }
}
