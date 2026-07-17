import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Health check pra load balancer/monitoramento (spec §57/§61). `$queryRaw`
 * não passa pelas extensões de tenant/auditoria (elas só interceptam
 * operações de model via `$allModels`/`$allOperations`), então funciona sem
 * nenhum contexto de tenant resolvido — é isso que torna essa rota segura
 * de ficar pública e sem autenticação.
 */
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
