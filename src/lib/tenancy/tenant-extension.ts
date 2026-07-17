import { Prisma } from "@prisma/client";
import { getCurrentTenant } from "@/lib/tenancy/current-tenant";

/**
 * Isolamento obrigatório de consultas — Fase 4 (CLAUDE_CODE_MULTI_TENANT_ZELOO.md
 * §24-27). Extensão do Prisma Client, mesmo padrão de src/lib/audit/audit-extension.ts
 * (intercepta em `$allModels.$allOperations`, resolve contexto via `headers()`/
 * `getCurrentTenant()` — não `AsyncLocalStorage` própria, pelo motivo já
 * documentado no audit-extension: o dataloader do Prisma quebra a continuidade
 * do `async_hooks` antes da query rodar).
 *
 * Regra deny-by-default (§24): toda operação nos modelos tenant-owned FALHA
 * (lança `MissingTenantContextError`) se não houver tenant resolvido no
 * contexto da requisição — nunca cai silenciosamente para "sem filtro" (que
 * vazaria dado de todos os tenants) nem para "primeiro tenant encontrado".
 *
 * Escritas (§26): `tenantId` enviado pelo chamador é sempre ignorado/
 * sobrescrito pelo valor do contexto — nunca confia em tenantId vindo de
 * fora (data ou where) exceto o que a própria extensão injeta aqui.
 */

export class MissingTenantContextError extends Error {
  constructor(model: string, operation: string) {
    super(`Operação "${operation}" em "${model}" exige um tenant no contexto da requisição, mas nenhum foi resolvido.`);
    this.name = "MissingTenantContextError";
  }
}

/**
 * Modelos tenant-owned (ver docs/tenancy/02-data-migration.md §2) — mesma
 * lista das tabelas que ganharam `tenant_id` na Etapa A. Nomes de model do
 * Prisma (PascalCase), não de tabela.
 */
const HARD_TENANT_MODELS = new Set([
  "UserRole",
  "Client",
  "Professional",
  "Service",
  "Appointment",
  "Payment",
  "PixCharge",
  "CashbookEntry",
  "CashRegister",
  "CashRegisterClosing",
  "RecurringAccountEntry",
  "AccountEntry",
  "CommissionClosing",
  "MessageTemplate",
  "MessageLog",
  "Media",
  "Setting",
]);

/**
 * AuditLog é híbrido de propósito (ver schema.prisma) — ações de plataforma
 * nunca têm tenant. Recebe tenantId quando disponível, mas nunca bloqueia
 * por falta dele.
 */
const SOFT_TENANT_MODELS = new Set(["AuditLog"]);

const READ_OPERATIONS = new Set(["findMany", "findFirst", "findFirstOrThrow", "findUnique", "findUniqueOrThrow", "count", "aggregate", "groupBy"]);
const SCOPED_WRITE_OPERATIONS = new Set(["update", "updateMany", "upsert", "delete", "deleteMany"]);

/**
 * Operações cujo `where` precisa ser um `WhereUniqueInput` de verdade (não
 * um filtro qualquer) — o Prisma exige que ele corresponda literalmente a um
 * `@id`/`@unique`/`@@unique` existente, sem campos extras que não façam
 * parte de algum desses. `findMany`/`count`/`updateMany`/etc. aceitam
 * qualquer filtro solto, por isso não entram aqui.
 */
const UNIQUE_WHERE_OPERATIONS = new Set(["findUnique", "findUniqueOrThrow", "update", "delete", "upsert"]);

/**
 * Modelos cuja identidade de negócio é uma chave natural composta com o
 * tenant (`@@unique([tenantId, <campo>])`) em vez de ter um campo simples
 * que sirva de seletor único sozinho. Hoje só `Setting.key` — corrigido
 * depois da Fase 16 (achado real: subir logo/favicon num tenant não-root
 * falhava com "Unique constraint failed on settings_key_key", ver
 * docs/tenancy/02-data-migration.md). Lista explícita, não uma heurística
 * genérica por "onde não tem id": um modelo pode perfeitamente ter outro
 * campo com `@unique` PRÓPRIO, sem nenhuma relação com tenant (ex.:
 * `Professional.userId`) — tratar "sem id, um campo só" como sinal de
 * chave composta quebraria esses casos (aconteceu, revertido).
 */
const TENANT_COMPOUND_UNIQUE_FIELD: Record<string, string> = {
  Setting: "key",
};

/**
 * Pra filtros soltos (`findMany`/`count`/`updateMany`/...), `{ ...where,
 * tenantId }` sempre funciona — é só mais um `AND` na cláusula.
 *
 * Pra `WhereUniqueInput` de verdade, isso só funciona enquanto o modelo tem
 * `id` como seletor (o Prisma aceita campos extras soltos ao lado de `id`,
 * tratados como filtro adicional) — nos modelos de `TENANT_COMPOUND_UNIQUE_FIELD`,
 * o `where` precisa virar `{ tenantId_<campo>: { tenantId, <campo> } }`, no
 * formato de campo composto que o Prisma gera.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mergeWhereTenantId(model: string, where: any, tenantId: string, isUniqueLookup: boolean): any {
  const compoundField = TENANT_COMPOUND_UNIQUE_FIELD[model];
  if (isUniqueLookup && compoundField && where && typeof where === "object" && compoundField in where) {
    return { [`tenantId_${compoundField}`]: { tenantId, [compoundField]: where[compoundField] } };
  }
  return { ...where, tenantId };
}

/**
 * O Prisma gera dois formatos de input pra `create`/`upsert.create`: o
 * "Checked" (relações só via `{ connect: {...} } }`, sem nenhum FK escalar
 * direto) e o "Unchecked" (FKs como escalar, ex.: `clientId: "..."`). A
 * escolha não é por campo — é tudo-ou-nada pro objeto `data` inteiro.
 *
 * Só força o formato "Checked" quando algum campo usa `{ connect }`/
 * `{ connectOrCreate }`, OU `{ create }` apontando pra um objeto único
 * (relação 1:1/opcional, ex.: `Service.defaultMessageTemplate`,
 * `AccountEntry.client`) — aí sim o call site escolheu entre a forma
 * escalar e a de relação, e optou pela de relação.
 *
 * `{ create: [...] }` com um ARRAY (relação 1:N, ex.:
 * `Appointment.services`) é diferente: não existe alternativa escalar pra
 * uma lista de filhos, então essa forma é válida tanto no "Checked" quanto
 * no "Unchecked" — não é sinal de nada. Tratar como se fosse quebrava a
 * criação de agendamento pelo fluxo público (`/agendar/confirmar`), que
 * mistura `clientId`/`professionalId` escalares com `services: { create:
 * [...] } }` no mesmo `data`. Achado real, Fase 14+.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function usesRelationSyntax(data: any): boolean {
  if (!data || typeof data !== "object") return false;
  return Object.values(data).some((v) => {
    if (v === null || typeof v !== "object" || Array.isArray(v) || v instanceof Date) return false;
    if ("connect" in v || "connectOrCreate" in v) return true;
    if ("create" in v && !Array.isArray((v as { create: unknown }).create)) return true;
    return false;
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function injectTenantOnCreate(data: any, tenantId: string): any {
  const { tenantId: _ignored, tenant: _ignoredRelation, ...rest } = data ?? {};
  return usesRelationSyntax(data) ? { ...rest, tenant: { connect: { id: tenantId } } } : { ...rest, tenantId };
}

export const tenantExtension = Prisma.defineExtension({
  name: "tenant-isolation",
  query: {
    $allModels: {
      async $allOperations({ model, operation, args, query }) {
        const isHard = HARD_TENANT_MODELS.has(model);
        const isSoft = SOFT_TENANT_MODELS.has(model);
        if (!isHard && !isSoft) return query(args);

        const tenant = await getCurrentTenant().catch(() => null);
        const tenantId = tenant?.id ?? null;

        if (!tenantId) {
          if (isHard) throw new MissingTenantContextError(model, operation);
          return query(args); // soft (AuditLog): segue sem tenant_id quando não há contexto
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const typedArgs = (args ?? {}) as any;

        if (operation === "create") {
          typedArgs.data = injectTenantOnCreate(typedArgs.data, tenantId);
        } else if (operation === "createMany") {
          // createMany não aceita relações aninhadas (só existe o input
          // "Unchecked" pra ele) — o escalar tenantId é sempre a forma certa.
          typedArgs.data = Array.isArray(typedArgs.data)
            ? typedArgs.data.map((d: object) => ({ ...d, tenantId }))
            : typedArgs.data;
        } else if (operation === "upsert") {
          typedArgs.where = mergeWhereTenantId(model, typedArgs.where, tenantId, true);
          typedArgs.create = injectTenantOnCreate(typedArgs.create, tenantId);
        } else if (READ_OPERATIONS.has(operation) || SCOPED_WRITE_OPERATIONS.has(operation)) {
          typedArgs.where = mergeWhereTenantId(model, typedArgs.where, tenantId, UNIQUE_WHERE_OPERATIONS.has(operation));
        }

        return query(typedArgs);
      },
    },
  },
});
