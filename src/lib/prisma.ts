import { Prisma, PrismaClient } from "@prisma/client";
import { auditExtension } from "@/lib/audit/audit-extension";
import { tenantExtension } from "@/lib/tenancy/tenant-extension";

/** Tipo aceito por repositories no construtor `(db: PrismaOrTx = prisma)` — cliente ou `tx` de uma transação. */
export type PrismaOrTx = PrismaClient | Prisma.TransactionClient;

/**
 * Extensões não mudam a forma da API pública (create/update/delete etc.
 * continuam com a mesma assinatura) — só interceptam em runtime. O cast de
 * volta pra `PrismaClient` evita que o tipo estendido do `$extends()` (que o
 * TypeScript não reconcilia bem com `Prisma.TransactionClient` dentro de
 * `$transaction`) se propague pelos ~15 repositories que tipam `PrismaOrTx`.
 *
 * `tenantExtension` depois de `auditExtension`: isolamento de tenant roda por
 * fora (injeta/valida tenant_id primeiro), auditoria por dentro — pela ordem
 * de composição do Prisma, o último `.$extends()` encadeado vira a camada
 * mais externa.
 */
function createPrismaClient(): PrismaClient {
  const client = new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  })
    .$extends(auditExtension)
    .$extends(tenantExtension);
  return client as unknown as PrismaClient;
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
