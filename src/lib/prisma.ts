import { Prisma, PrismaClient } from "@prisma/client";
import { auditExtension } from "@/lib/audit/audit-extension";

/** Tipo aceito por repositories no construtor `(db: PrismaOrTx = prisma)` — cliente ou `tx` de uma transação. */
export type PrismaOrTx = PrismaClient | Prisma.TransactionClient;

/**
 * A extensão de auditoria não muda a forma da API pública (create/update/delete
 * etc. continuam com a mesma assinatura) — só intercepta em runtime. O cast de
 * volta pra `PrismaClient` evita que o tipo estendido do `$extends()` (que o
 * TypeScript não reconcilia bem com `Prisma.TransactionClient` dentro de
 * `$transaction`) se propague pelos ~9 repositories que tipam `PrismaOrTx`.
 */
function createPrismaClient(): PrismaClient {
  const client = new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  }).$extends(auditExtension);
  return client as unknown as PrismaClient;
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
