import { Prisma } from "@prisma/client";
import { headers } from "next/headers";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/prisma";
import { SETTINGS_KEYS } from "@/modules/settings/schemas/settings.schema";

interface AuditContext {
  userId: string | null;
  ipAddress: string | null;
  userAgent: string | null;
}

/**
 * Lê o contexto da requisição atual (sessão + headers) sob demanda, direto
 * do mecanismo de request-scoping do próprio Next.js — não de um valor
 * "relayado" via `AsyncLocalStorage` própria. Tentativa inicial usava
 * `AsyncLocalStorage.enterWith()` em `requireUserId()` + leitura aqui, mas o
 * contexto chegava sempre `null`: o dispatch interno do Prisma (dataloader/
 * batching via `process.nextTick`) quebra a continuidade do `async_hooks`
 * antes mesmo da query rodar — limitação conhecida de combinar
 * `AsyncLocalStorage` própria com o client do Prisma. `auth()`/`headers()`
 * do Next.js usam o request-store interno do próprio framework, que
 * continua correto dentro do mesmo ciclo de vida da requisição.
 */
async function getCurrentAuditContext(): Promise<AuditContext> {
  try {
    const session = await auth();
    const headersList = headers();
    return {
      userId: session?.user?.id ?? null,
      ipAddress: headersList.get("x-forwarded-for") ?? headersList.get("x-real-ip"),
      userAgent: headersList.get("user-agent"),
    };
  } catch {
    // Fora de uma requisição (build, webhook, script) — sem contexto, e tudo bem.
    return { userId: null, ipAddress: null, userAgent: null };
  }
}

/**
 * Modelos auditados. Fora dessa lista, nenhuma sobrecarga é aplicada —
 * a query segue direto pro banco sem overhead.
 */
const AUDITED_MODELS = new Set([
  "Client",
  "Professional",
  "Service",
  "Appointment",
  "Payment",
  "User",
  "Setting",
  "PixCharge",
  // Fase 10 (spec §49, "role_changed") — atribuição/remoção de papel.
  "UserRole",
]);

const WRITE_OPERATIONS = new Set(["create", "update", "upsert", "delete", "updateMany", "deleteMany"]);

function toClientProperty(model: string): string {
  return model.charAt(0).toLowerCase() + model.slice(1);
}

/**
 * Campos que nunca podem ir pro audit log em texto puro, mesmo sendo hash
 * (senha) ou já mascarados em outro lugar — não confiar duas vezes na mesma
 * regra. `Setting` é tratado à parte logo abaixo: sensibilidade depende do
 * `key` da linha, não de um nome de campo fixo (spec §47: "não registrar
 * senhas, tokens... credenciais de WhatsApp").
 */
const SENSITIVE_FIELDS: Partial<Record<string, string[]>> = {
  User: ["passwordHash"],
};

const SENSITIVE_SETTING_KEYS = new Set<string>([SETTINGS_KEYS.mercadoPagoAccessToken, SETTINGS_KEYS.mercadoPagoWebhookSecret]);

const REDACTED = "[REDACTED]";

/** Aplica a redação acima num valor (linha única ou array de linhas) antes de virar JSON. */
function redactSensitive(model: string, value: unknown): unknown {
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map((v) => redactSensitive(model, v));

  const row = { ...(value as Record<string, unknown>) };

  for (const field of SENSITIVE_FIELDS[model] ?? []) {
    if (field in row) row[field] = REDACTED;
  }

  if (model === "Setting" && typeof row.key === "string" && SENSITIVE_SETTING_KEYS.has(row.key)) {
    row.value = REDACTED;
  }

  return row;
}

/** Converte pra um valor serializável em JSON (Decimal/Date viram string/ISO). */
function toJsonSafe(value: unknown): Prisma.InputJsonValue | undefined {
  if (value === null || value === undefined) return undefined;
  return JSON.parse(JSON.stringify(value));
}

function actionLabel(operation: string): "CREATE" | "UPDATE" | "DELETE" {
  if (operation === "create") return "CREATE";
  if (operation === "delete" || operation === "deleteMany") return "DELETE";
  return "UPDATE";
}

/**
 * Extensão de auditoria: intercepta create/update/upsert/delete/updateMany/deleteMany
 * nos modelos auditados, grava uma linha em `audit_logs` depois que a operação
 * original suceder.
 *
 * Usa a referência `prisma` (importada do módulo — import circular resolvido
 * de forma preguiçosa, já que só é acessada dentro do callback assíncrono,
 * bem depois dos dois módulos terminarem de carregar) em vez de `this`: dentro
 * de `$allOperations`, `this` só dá acesso ao delegate do modelo atual, não
 * aos outros modelos (`auditLog` incluso) — tentativa inicial com `this`
 * falhava com "Cannot read properties of undefined (reading 'create')".
 *
 * Limitação conhecida: como a gravação do log usa sempre o client de nível
 * superior (não o `tx` de uma transação em andamento), se a gravação original
 * acontecer dentro de `prisma.$transaction(async (tx) => ...)` e a transação
 * for revertida DEPOIS dessa operação específica já ter sido registrada, a
 * linha de auditoria pode ficar gravada mesmo com a mutação revertida. Nos
 * pontos transacionais existentes hoje (finance.service.ts, user.repository.ts)
 * isso só ocorreria se um passo posterior da mesma transação falhasse — não
 * bloqueia o uso, mas vale ter em mente ao investigar uma discrepância futura.
 */
export const auditExtension = Prisma.defineExtension({
  name: "audit-log",
  query: {
    $allModels: {
      async $allOperations({ model, operation, args, query }) {
        if (!AUDITED_MODELS.has(model) || !WRITE_OPERATIONS.has(operation)) {
          return query(args);
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const modelClient = (prisma as any)[toClientProperty(model)];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const where = (args as any)?.where;

        let oldValues: unknown = null;
        try {
          if ((operation === "update" || operation === "upsert" || operation === "delete") && where) {
            oldValues = await modelClient.findUnique({ where });
          } else if ((operation === "updateMany" || operation === "deleteMany") && where) {
            oldValues = await modelClient.findMany({ where });
          }
        } catch {
          oldValues = null;
        }

        const result = await query(args);

        try {
          const context = await getCurrentAuditContext();
          const isBulk = operation === "updateMany" || operation === "deleteMany";
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const entityId = isBulk ? null : ((result as any)?.id ?? where?.id ?? null);

          await prisma.auditLog.create({
            data: {
              userId: context.userId,
              ipAddress: context.ipAddress,
              userAgent: context.userAgent,
              action: actionLabel(operation),
              entity: model,
              entityId,
              oldValues: toJsonSafe(redactSensitive(model, oldValues)),
              newValues: operation.startsWith("delete") ? undefined : toJsonSafe(redactSensitive(model, result)),
            },
          });
        } catch (error) {
          // Auditoria nunca deve derrubar a operação original.
          console.error("Falha ao gravar audit log:", error);
        }

        return result;
      },
    },
  },
});
