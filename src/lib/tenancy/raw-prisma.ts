import "server-only";
import { PrismaClient } from "@prisma/client";

/**
 * `PrismaClient` cru (sem `tenantExtension`/`auditExtension`), pra
 * operações de nível plataforma que não fazem sentido escopadas pelo tenant
 * *da requisição atual* — provisionamento de tenant, mudança de status,
 * leitura de dados de suporte do tenant raiz a partir de uma página que
 * pode estar renderizando no contexto de outro tenant (`/tenant-indisponivel`).
 * Mesmo padrão já usado em `prisma/tenancy-backfill.ts` e nos seeds.
 * Singleton via `globalThis` (mesmo motivo do `src/lib/prisma.ts`): evita
 * abrir uma conexão nova a cada hot-reload em dev.
 */
const globalForRawPrisma = globalThis as unknown as { rawPrismaSingleton?: PrismaClient };
export const rawPrisma = globalForRawPrisma.rawPrismaSingleton ?? new PrismaClient();
if (process.env.NODE_ENV !== "production") globalForRawPrisma.rawPrismaSingleton = rawPrisma;
