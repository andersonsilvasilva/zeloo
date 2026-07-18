import "server-only";
import { addDays } from "date-fns";
import { hashPassword } from "@/lib/auth/password";
import { ROLES } from "@/lib/auth/permissions";
import { rawPrisma } from "@/lib/tenancy/raw-prisma";
import { tenantSlugSchema } from "@/modules/tenancy/schemas/tenant.schema";
import { DEFAULT_TIMEZONE } from "@/modules/settings/schemas/settings.schema";

/**
 * Provisionamento de tenant — Fase 9 (CLAUDE_CODE_MULTI_TENANT_ZELOO.md §43).
 *
 * Usa um `PrismaClient` cru (não o `@/lib/prisma` estendido) de propósito:
 * a extensão de isolamento da Fase 4 (`tenantExtension`) sobrescreve
 * `tenantId` em toda escrita de modelo tenant-owned pelo tenant *da
 * requisição atual* — mas provisionar é exatamente o ato de criar um
 * tenant que ainda não existe, sem nenhum tenant "atual" fazendo sentido
 * aqui. Mesma lógica de `prisma/tenancy-backfill.ts`/seeds, que já
 * usam o client cru por esse motivo. Tudo dentro de uma única transação —
 * mistura client cru + estendido na mesma `$transaction` não seria atômica
 * (conexões diferentes), então é tudo cru, com `tenantId` setado
 * manualmente em cada linha.
 */

const TRIAL_PLAN_SLUG = "trial";
const TRIAL_DAYS = 30;

/**
 * Recursos do plano trial padrão — valores técnicos provisórios (generosos,
 * pra nunca travar quem está testando), **não são decisão comercial**. Ver
 * docs/tenancy/07-onboarding.md §3 — precisa de definição de negócio antes
 * de qualquer cobrança real existir.
 */
const TRIAL_PLAN_FEATURES: Record<string, string> = {
  users: "20",
  professionals: "20",
  appointments_per_month: "1000",
  storage_mb: "2000",
  whatsapp_messages: "500",
  financial: "true",
  pix: "true",
  advanced_reports: "true",
};

export class TenantSlugInvalidError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TenantSlugInvalidError";
  }
}

export interface ProvisionTenantInput {
  tenantName: string;
  slug: string;
  ownerName: string;
  ownerEmail: string;
  /** Só usado se ainda não existir um User com esse e-mail. */
  ownerPassword: string;
  timezone?: string;
  locale?: string;
}

export interface ProvisionTenantResult {
  tenantId: string;
  slug: string;
  status: string;
  ownerUserId: string;
  /** true = tenant já existia (idempotente); nada foi recriado. */
  alreadyProvisioned: boolean;
  url: string;
}

async function ensureTrialPlan(): Promise<{ id: string }> {
  return rawPrisma.plan.upsert({
    where: { slug: TRIAL_PLAN_SLUG },
    update: {},
    create: {
      slug: TRIAL_PLAN_SLUG,
      name: "Trial (30 dias)",
      features: { create: Object.entries(TRIAL_PLAN_FEATURES).map(([key, value]) => ({ key, value })) },
    },
    select: { id: true },
  });
}

/**
 * Provisiona um tenant novo (spec §43) — transacional, com rollback
 * automático se qualquer etapa falhar. Idempotente pela chave natural
 * `slug` (spec §44): tentar provisionar o mesmo slug de novo não recria
 * nada, só retorna o tenant já existente com `alreadyProvisioned: true`.
 */
export async function provisionTenant(input: ProvisionTenantInput): Promise<ProvisionTenantResult> {
  const slugResult = tenantSlugSchema.safeParse(input.slug);
  if (!slugResult.success) throw new TenantSlugInvalidError(slugResult.error.issues[0]?.message ?? "Slug inválido.");
  const slug = slugResult.data;

  const baseDomain = process.env.APP_BASE_DOMAIN ?? "zeloo.net";
  const url = `https://${slug}.${baseDomain}`;

  const existing = await rawPrisma.tenant.findUnique({ where: { slug } });
  if (existing) {
    const membership = await rawPrisma.tenantUser.findFirst({ where: { tenantId: existing.id }, select: { userId: true } });
    return {
      tenantId: existing.id,
      slug: existing.slug,
      status: existing.status,
      ownerUserId: membership?.userId ?? "",
      alreadyProvisioned: true,
      url,
    };
  }

  const trialPlan = await ensureTrialPlan();

  const result = await rawPrisma.$transaction(async (tx) => {
    const tenant = await tx.tenant.create({
      data: {
        name: input.tenantName,
        slug,
        status: "TRIAL",
        timezone: input.timezone || DEFAULT_TIMEZONE,
        locale: input.locale || "pt-BR",
        trialEndsAt: addDays(new Date(), TRIAL_DAYS),
      },
    });

    let owner = await tx.user.findUnique({ where: { email: input.ownerEmail } });
    if (!owner) {
      const passwordHash = await hashPassword(input.ownerPassword);
      owner = await tx.user.create({
        data: { name: input.ownerName, email: input.ownerEmail, passwordHash, status: "ACTIVE" },
      });
    }

    await tx.tenantUser.create({ data: { tenantId: tenant.id, userId: owner.id, status: "ACTIVE" } });

    // Papel mais próximo de "tenant_owner" no catálogo global de roles
    // deste projeto (não há role dedicada — ver docs/tenancy/07-onboarding.md §2).
    const ownerRole = await tx.role.findUniqueOrThrow({ where: { slug: ROLES.ADMIN } });
    await tx.userRole.create({ data: { userId: owner.id, roleId: ownerRole.id, tenantId: tenant.id } });

    // "Criar configurações padrão" (spec §43 passo 6) fica pra quando o
    // tenant acessar Configurações pela primeira vez — não pra cá.
    // `Setting.key` já é @@unique([tenantId, key]) (corrigido depois da
    // Fase 16 — achado real: um tenant não-root não conseguia salvar
    // NENHUMA configuração que o zeloo já tivesse, ver
    // docs/tenancy/02-data-migration.md §6), então não haveria mais risco
    // de colisão se quiséssemos pré-criar linhas aqui — mas continua sem
    // necessidade: `SettingsService.getGeneralSettings()` já trata ausência
    // de qualquer chave com fallback vazio/padrão (`DEFAULT_TIMEZONE` etc.),
    // então um tenant novo só vê campos em branco até preencher
    // Configurações, o que já é o comportamento esperado.

    await tx.subscription.create({
      data: { tenantId: tenant.id, planId: trialPlan.id, status: "TRIALING" },
    });

    await tx.auditLog.create({
      data: {
        tenantId: tenant.id,
        userId: owner.id,
        action: "tenant_created",
        entity: "Tenant",
        entityId: tenant.id,
        newValues: { name: tenant.name, slug: tenant.slug, status: tenant.status },
      },
    });

    return { tenant, ownerId: owner.id };
  });

  return {
    tenantId: result.tenant.id,
    slug: result.tenant.slug,
    status: result.tenant.status,
    ownerUserId: result.ownerId,
    alreadyProvisioned: false,
    url,
  };
}

export class TenantNotFoundError extends Error {
  constructor() {
    super("Tenant não encontrado.");
    this.name = "TenantNotFoundError";
  }
}

export class CannotChangeRootTenantStatusError extends Error {
  constructor() {
    super("O tenant raiz não pode ser suspenso/cancelado por aqui — isso derrubaria o próprio painel de administração.");
    this.name = "CannotChangeRootTenantStatusError";
  }
}

/**
 * Muda o status de um tenant (suspender/reativar/cancelar) — spec §49,
 * "tenant_suspended" era a única ação crítica sem cobertura de auditoria
 * até aqui (ver docs/tenancy/08-observability.md item 4). Usa o client cru
 * pelo mesmo motivo de `provisionTenant()`: o admin que aciona isso está
 * logado no tenant raiz, então a extensão de isolamento gravaria o
 * `AuditLog` como pertencente ao tenant raiz (sobrescreve `tenantId` sempre
 * pelo da requisição atual) — errado aqui, o log tem que pertencer ao
 * tenant que está sendo alterado, não a quem alterou.
 */
export async function updateTenantStatus(
  tenantId: string,
  status: "TRIAL" | "ACTIVE" | "SUSPENDED" | "CANCELLED",
  actingUserId: string,
): Promise<{ id: string; slug: string; status: string }> {
  const tenant = await rawPrisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) throw new TenantNotFoundError();
  if (tenant.slug === (process.env.ROOT_TENANT_SLUG ?? "")) throw new CannotChangeRootTenantStatusError();

  const previousStatus = tenant.status;

  // "Reativar" (pedido como ACTIVE) num tenant SUSPENDED restaura o status
  // de ANTES da suspensão (ex.: TRIAL), não promove direto pra ACTIVE — achado
  // real testando: suspender e reativar um tenant em TRIAL virava ACTIVE
  // silenciosamente, perdendo a distinção. A fonte da verdade é o próprio
  // AuditLog de "tenant_suspended" já gravado (oldValues.status).
  let targetStatus = status;
  if (status === "ACTIVE" && previousStatus === "SUSPENDED") {
    const lastSuspension = await rawPrisma.auditLog.findFirst({
      where: { entity: "Tenant", entityId: tenantId, action: "tenant_suspended" },
      orderBy: { createdAt: "desc" },
    });
    const restoredStatus = (lastSuspension?.oldValues as { status?: string } | null)?.status;
    if (restoredStatus === "TRIAL" || restoredStatus === "ACTIVE") {
      targetStatus = restoredStatus;
    }
  }

  const updated = await rawPrisma.tenant.update({ where: { id: tenantId }, data: { status: targetStatus } });

  const action = status === "SUSPENDED" ? "tenant_suspended" : status === "ACTIVE" ? "tenant_reactivated" : status === "CANCELLED" ? "tenant_cancelled" : "tenant_status_changed";
  await rawPrisma.auditLog.create({
    data: {
      tenantId: updated.id,
      userId: actingUserId,
      action,
      entity: "Tenant",
      entityId: updated.id,
      oldValues: { status: previousStatus },
      newValues: { status: updated.status },
    },
  });

  return { id: updated.id, slug: updated.slug, status: updated.status };
}
