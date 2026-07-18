/**
 * Backfill seguro de tenant_id nas tabelas existentes — Fase 3, Etapa B
 * (CLAUDE_CODE_MULTI_TENANT_ZELOO.md §20). Idempotente: rodar de novo depois
 * de já aplicado só encontra 0 linhas pendentes em cada tabela.
 *
 * Uso:
 *   npx tsx prisma/tenancy-backfill.ts --slug=zeloo --name="Zeloo" --dry-run
 *   npx tsx prisma/tenancy-backfill.ts --slug=zeloo --name="Zeloo" --apply
 *
 * Nunca escolhe o slug sozinho (sempre --slug explícito). Cria o tenant se
 * ainda não existir (upsert por slug) — só na primeira execução; execuções
 * seguintes reaproveitam o mesmo tenant. Cada tabela é preenchida com
 * `UPDATE ... WHERE tenant_id IS NULL`, então rodar de novo não duplica nem
 * sobrescreve nada. Tudo dentro de uma única transação no modo --apply: se
 * qualquer etapa falhar, nada é gravado.
 */
import { PrismaClient } from "@prisma/client";
import { tenantSlugSchema } from "../src/modules/tenancy/schemas/tenant.schema";

const prisma = new PrismaClient();

/**
 * Forma mínima que este script usa de cada delegate do Prisma Client. Os
 * delegates reais (`prisma.client`, `prisma.payment`, etc.) têm overloads
 * incompatíveis entre si — indexar por uma union de nomes de model
 * (`prisma[model]`) produz uma união de tipos que o TS não consegue chamar
 * uniformemente. Em vez de silenciar com `any`, tipamos só o que é usado.
 */
interface TenantScopedDelegate {
  count(args?: { where?: { tenantId?: string | null } }): Promise<number>;
  updateMany(args: { where: { tenantId: null }; data: { tenantId: string } }): Promise<{ count: number }>;
}

function getDelegate(client: unknown, model: string): TenantScopedDelegate {
  return (client as Record<string, TenantScopedDelegate>)[model];
}

function parseArgs() {
  const args = new Map<string, string | boolean>();
  for (const raw of process.argv.slice(2)) {
    if (raw === "--dry-run" || raw === "--apply") {
      args.set(raw.slice(2), true);
      continue;
    }
    const match = raw.match(/^--([^=]+)=(.*)$/);
    if (match) args.set(match[1], match[2]);
  }
  return args;
}

// Tabelas tenant-owned que ganharam tenant_id nullable na Etapa A — nome do
// model Prisma (camelCase) mapeado pro nome legível no relatório.
const TENANT_OWNED_MODELS = [
  "userRole",
  "client",
  "professional",
  "service",
  "appointment",
  "payment",
  "pixCharge",
  "cashbookEntry",
  "cashRegister",
  "cashRegisterClosing",
  "recurringAccountEntry",
  "accountEntry",
  "commissionClosing",
  "messageTemplate",
  "messageLog",
  "media",
  "setting",
  "auditLog",
] as const;

interface TableReport {
  model: string;
  totalBefore: number;
  nullBefore: number;
  updated: number;
  nullAfter: number;
}

async function main() {
  const args = parseArgs();
  const rawSlug = args.get("slug");
  const name = args.get("name");
  const dryRun = Boolean(args.get("dry-run"));
  const apply = Boolean(args.get("apply"));

  if (!rawSlug || typeof rawSlug !== "string") {
    console.error("Erro: --slug=<slug> é obrigatório. Não escolho um slug automaticamente.");
    process.exit(1);
  }
  if (dryRun === apply) {
    console.error("Erro: informe exatamente um de --dry-run ou --apply.");
    process.exit(1);
  }

  const slugResult = tenantSlugSchema.safeParse(rawSlug);
  if (!slugResult.success) {
    console.error(`Erro: slug inválido — ${slugResult.error.issues[0]?.message}`);
    process.exit(1);
  }
  const slug = slugResult.data;

  console.log(`=== Backfill de tenant_id — modo ${dryRun ? "DRY-RUN (nada será gravado)" : "APPLY"} ===`);
  console.log(`Slug alvo: ${slug}`);

  const existingTenant = await prisma.tenant.findUnique({ where: { slug } });

  if (!existingTenant && dryRun) {
    if (!name || typeof name !== "string") {
      console.error("Erro: tenant não existe ainda — informe --name=\"Nome\" para criá-lo (necessário mesmo em --dry-run, só pra validar).");
      process.exit(1);
    }
    console.log(`[DRY-RUN] Tenant "${slug}" não existe — seria criado com name="${name}", status=ACTIVE.`);
  } else if (existingTenant) {
    console.log(`Tenant "${slug}" já existe (id=${existingTenant.id}, status=${existingTenant.status}) — reaproveitando.`);
  }

  const userCount = await prisma.user.count();
  const existingMemberships = existingTenant
    ? await prisma.tenantUser.count({ where: { tenantId: existingTenant.id } })
    : 0;
  console.log(`Usuários no sistema: ${userCount}. Memberships já existentes pra esse tenant: ${existingMemberships}.`);

  const reports: TableReport[] = [];
  for (const model of TENANT_OWNED_MODELS) {
    const delegate = getDelegate(prisma, model);
    const totalBefore: number = await delegate.count();
    const nullBefore: number = await delegate.count({ where: { tenantId: null } });
    reports.push({ model, totalBefore, nullBefore, updated: 0, nullAfter: nullBefore });
  }

  console.log("\n--- Relatório ANTES do backfill ---");
  for (const r of reports) {
    console.log(`${r.model.padEnd(24)} total=${r.totalBefore.toString().padStart(5)}  sem_tenant=${r.nullBefore.toString().padStart(5)}`);
  }

  if (dryRun) {
    console.log("\n[DRY-RUN] Nenhuma escrita foi feita. Rode com --apply pra executar de verdade.");
    return;
  }

  // --apply a partir daqui
  await prisma.$transaction(async (tx) => {
    const tenant = await tx.tenant.upsert({
      where: { slug },
      update: {},
      create: { slug, name: (name as string) ?? slug, status: "ACTIVE" },
    });
    console.log(`\nTenant confirmado: id=${tenant.id}, slug=${tenant.slug}, status=${tenant.status}`);

    const allUsers = await tx.user.findMany({ select: { id: true } });
    let membershipsCreated = 0;
    for (const u of allUsers) {
      const result = await tx.tenantUser.upsert({
        where: { tenantId_userId: { tenantId: tenant.id, userId: u.id } },
        update: {},
        create: { tenantId: tenant.id, userId: u.id, status: "ACTIVE" },
      });
      if (result) membershipsCreated += 1;
    }
    console.log(`Memberships confirmadas (criadas ou já existentes): ${membershipsCreated}`);

    for (const r of reports) {
      const delegate = getDelegate(tx, r.model);
      const { count } = await delegate.updateMany({
        where: { tenantId: null },
        data: { tenantId: tenant.id },
      });
      r.updated = count;
      r.nullAfter = await delegate.count({ where: { tenantId: null } });
    }
  }, { timeout: 30000 });

  console.log("\n--- Relatório DEPOIS do backfill ---");
  let inconsistent = false;
  for (const r of reports) {
    const ok = r.nullAfter === 0;
    if (!ok) inconsistent = true;
    console.log(
      `${r.model.padEnd(24)} total=${r.totalBefore.toString().padStart(5)}  atualizados=${r.updated.toString().padStart(5)}  sem_tenant_depois=${r.nullAfter.toString().padStart(5)} ${ok ? "OK" : "⚠️ INCONSISTENTE"}`,
    );
  }

  if (inconsistent) {
    console.error("\n⚠️  Alguma tabela ainda tem registros sem tenant_id depois do backfill — investigar antes de prosseguir pra Etapa C.");
    process.exit(1);
  }

  console.log("\n✅ Backfill concluído sem registros órfãos.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
