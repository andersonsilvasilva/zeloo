/**
 * Migração de arquivos existentes pra estrutura por tenant — Fase 7, Etapa
 * de storage (CLAUDE_CODE_MULTI_TENANT_ZELOO.md §40). Move cada arquivo
 * rastreado em `Media` de `public/uploads/<folder>/...` pra
 * `public/uploads/tenants/{tenantId}/<folder>/...`, atualizando
 * `Media.storagePath` no banco. Idempotente: uma linha cujo `storagePath`
 * já começa com `tenants/` é pulada.
 *
 * Uso:
 *   npx tsx prisma/tenancy-storage-migrate.ts --dry-run
 *   npx tsx prisma/tenancy-storage-migrate.ts --apply
 *
 * Segurança: nunca apaga o arquivo de origem antes de copiar o destino E
 * confirmar checksum SHA-256 igual nos dois lados, pras 3 variantes
 * (thumb/medium/large) de cada `Media`. Falha em qualquer variante aborta
 * só aquela linha (reportada), sem tocar no banco nem apagar nada — outras
 * linhas continuam normalmente. Seguro pra rodar de novo depois de corrigir
 * o que causou a falha.
 */
import { PrismaClient } from "@prisma/client";
import { createHash } from "crypto";
import { readFile, mkdir, copyFile, unlink, access } from "fs/promises";
import path from "path";

const prisma = new PrismaClient();
const UPLOAD_ROOT = path.join(process.cwd(), "public", "uploads");

function parseArgs() {
  const args = new Set(process.argv.slice(2));
  return { dryRun: args.has("--dry-run"), apply: args.has("--apply") };
}

function variantPaths(storagePath: string): { thumb: string; medium: string; large: string } {
  const base = storagePath.replace(/-large\.(webp|jpg)$/, "");
  const ext = storagePath.match(/-large\.(webp|jpg)$/)?.[1] ?? "webp";
  return {
    thumb: `${base}-thumb.webp`,
    medium: `${base}-medium.webp`,
    large: `${base}-large.${ext}`,
  };
}

async function fileExists(p: string): Promise<boolean> {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

async function sha256(filePath: string): Promise<string> {
  const buf = await readFile(filePath);
  return createHash("sha256").update(buf).digest("hex");
}

interface RowResult {
  mediaId: string;
  oldStoragePath: string;
  newStoragePath: string;
  status: "migrated" | "skipped_already_migrated" | "would_migrate" | "failed_missing_source" | "failed_checksum_mismatch";
  detail?: string;
}

async function main() {
  const { dryRun, apply } = parseArgs();
  if (dryRun === apply) {
    console.error("Erro: informe exatamente um de --dry-run ou --apply.");
    process.exit(1);
  }

  console.log(`=== Migração de storage por tenant — modo ${dryRun ? "DRY-RUN (nada será movido)" : "APPLY"} ===`);

  const mediaRows = await prisma.media.findMany({ select: { id: true, storagePath: true, tenantId: true } });
  console.log(`${mediaRows.length} registros de Media encontrados.\n`);

  const results: RowResult[] = [];

  for (const row of mediaRows) {
    if (row.storagePath.startsWith("tenants/")) {
      results.push({ mediaId: row.id, oldStoragePath: row.storagePath, newStoragePath: row.storagePath, status: "skipped_already_migrated" });
      continue;
    }

    if (!row.tenantId) {
      results.push({ mediaId: row.id, oldStoragePath: row.storagePath, newStoragePath: "", status: "failed_missing_source", detail: "Media sem tenant_id — rode o backfill da Fase 3 primeiro." });
      continue;
    }

    const oldVariants = variantPaths(row.storagePath);
    const newBase = `tenants/${row.tenantId}/${row.storagePath.replace(/-large\.(webp|jpg)$/, "")}`;
    const newStoragePath = `tenants/${row.tenantId}/${row.storagePath}`;
    const newVariants = variantPaths(newStoragePath);

    if (dryRun) {
      const missing: string[] = [];
      for (const [label, rel] of Object.entries(oldVariants)) {
        const abs = path.join(UPLOAD_ROOT, rel);
        if (!(await fileExists(abs))) missing.push(label);
      }
      results.push({
        mediaId: row.id,
        oldStoragePath: row.storagePath,
        newStoragePath,
        status: missing.length > 0 ? "failed_missing_source" : "would_migrate",
        detail: missing.length > 0 ? `Variantes ausentes no disco: ${missing.join(", ")}` : undefined,
      });
      continue;
    }

    // --apply
    let allOk = true;
    let failStatus: RowResult["status"] = "migrated";
    let failDetail = "";
    for (const key of ["thumb", "medium", "large"] as const) {
      const srcAbs = path.join(UPLOAD_ROOT, oldVariants[key]);
      const destAbs = path.join(UPLOAD_ROOT, newVariants[key]);

      if (!(await fileExists(srcAbs))) {
        allOk = false;
        failStatus = "failed_missing_source";
        failDetail = `Variante "${key}" ausente no disco: ${oldVariants[key]}`;
        break;
      }

      await mkdir(path.dirname(destAbs), { recursive: true });
      await copyFile(srcAbs, destAbs);

      const [srcHash, destHash] = await Promise.all([sha256(srcAbs), sha256(destAbs)]);
      if (srcHash !== destHash) {
        allOk = false;
        failStatus = "failed_checksum_mismatch";
        failDetail = `Checksum divergente na variante "${key}" — origem e destino diferentes após a cópia.`;
        break;
      }
    }

    if (!allOk) {
      results.push({ mediaId: row.id, oldStoragePath: row.storagePath, newStoragePath, status: failStatus, detail: failDetail });
      continue;
    }

    // Todas as variantes copiadas e com checksum batendo — agora sim apaga a origem e atualiza o banco.
    for (const rel of Object.values(oldVariants)) {
      await unlink(path.join(UPLOAD_ROOT, rel)).catch(() => undefined);
    }
    await prisma.media.update({ where: { id: row.id }, data: { storagePath: newStoragePath } });

    results.push({ mediaId: row.id, oldStoragePath: row.storagePath, newStoragePath, status: "migrated" });
    void newBase; // só usado pra clareza de leitura acima, não precisa em outro lugar
  }

  console.log("--- Relatório por arquivo ---");
  for (const r of results) {
    console.log(`[${r.status}] ${r.mediaId}  ${r.oldStoragePath}  ->  ${r.newStoragePath}${r.detail ? `  (${r.detail})` : ""}`);
  }

  const counts = results.reduce<Record<string, number>>((acc, r) => {
    acc[r.status] = (acc[r.status] ?? 0) + 1;
    return acc;
  }, {});
  console.log("\n--- Resumo ---");
  console.log(JSON.stringify(counts, null, 2));

  const hasFailures = results.some((r) => r.status.startsWith("failed"));
  if (hasFailures) {
    console.error("\n⚠️  Uma ou mais linhas falharam — nada foi apagado/alterado pra essas linhas. Corrija e rode de novo (idempotente).");
    process.exit(1);
  }

  console.log(dryRun ? "\n[DRY-RUN] Nenhum arquivo foi movido, nenhum registro foi alterado." : "\n✅ Migração concluída sem falhas.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
