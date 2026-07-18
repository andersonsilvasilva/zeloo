import { writeFile, mkdir, unlink } from "fs/promises";
import path from "path";
import sharp from "sharp";
import { nanoid } from "nanoid";
import type { StorageProvider, UploadInput, UploadResult } from "@/lib/storage/storage-provider";
import { getCurrentTenant } from "@/lib/tenancy/current-tenant";

const UPLOAD_ROOT = path.join(process.cwd(), "public", "uploads");
const ALLOWED_MIME = new Set(["image/png", "image/jpeg", "image/jpg", "image/webp"]);
const MAX_FILE_SIZE_BYTES = 8 * 1024 * 1024; // 8MB

export class StorageMissingTenantContextError extends Error {
  constructor() {
    super("Upload exige um tenant no contexto da requisição, mas nenhum foi resolvido.");
    this.name = "StorageMissingTenantContextError";
  }
}

function assertValidImage(input: UploadInput) {
  if (!ALLOWED_MIME.has(input.mimeType)) {
    throw new Error(`Tipo de arquivo não permitido: ${input.mimeType}`);
  }
  if (input.buffer.byteLength > MAX_FILE_SIZE_BYTES) {
    throw new Error("Arquivo excede o tamanho máximo permitido (8MB).");
  }
}

function randomFileName(originalName: string) {
  const ext = path.extname(originalName).toLowerCase() || ".webp";
  return `${nanoid(24)}${ext}`;
}

/**
 * Implementação local (dev) do StorageProvider.
 * Gera três variantes (thumbnail/medium/large) via Sharp e salva em
 * /public/uploads/tenants/{tenantId}/<folder>/ (Fase 7 — antes da migração
 * multi-tenant, era /public/uploads/<folder>/ direto, sem segmentação por
 * tenant; ver docs/tenancy/05-storage.md). Em produção, trocar por
 * S3/R2/Supabase implementando a mesma interface — o prefixo por tenant
 * também deve valer lá (key/objectPath, não pasta física).
 */
export class LocalStorageProvider implements StorageProvider {
  async upload(input: UploadInput): Promise<UploadResult> {
    assertValidImage(input);

    const tenant = await getCurrentTenant();
    if (!tenant) throw new StorageMissingTenantContextError();

    const tenantFolder = `tenants/${tenant.id}/${input.folder}`;
    const folderPath = path.join(UPLOAD_ROOT, "tenants", tenant.id, input.folder);
    await mkdir(folderPath, { recursive: true });

    const fileName = randomFileName(input.originalName);
    const baseName = fileName.replace(path.extname(fileName), "");

    const image = sharp(input.buffer);
    const metadata = await image.metadata();
    const largeFormat = input.largeFormat ?? "webp";
    const largeExt = largeFormat === "jpeg" ? "jpg" : "webp";
    const largePipeline =
      largeFormat === "jpeg"
        ? image.clone().resize(1200, 1200, { fit: "inside" }).flatten({ background: "#ffffff" }).jpeg({ quality: 90 })
        : image.clone().resize(1200, 1200, { fit: "inside" }).webp({ quality: 90 });

    // Gera variantes; a "large" é a referência salva no banco (storagePath).
    await Promise.all([
      image.clone().resize(150, 150, { fit: "cover" }).webp({ quality: 80 })
        .toFile(path.join(folderPath, `${baseName}-thumb.webp`)),
      image.clone().resize(500, 500, { fit: "inside" }).webp({ quality: 85 })
        .toFile(path.join(folderPath, `${baseName}-medium.webp`)),
      largePipeline.toFile(path.join(folderPath, `${baseName}-large.${largeExt}`)),
    ]);

    const storagePath = `${tenantFolder}/${baseName}-large.${largeExt}`;

    return {
      fileName,
      storagePath,
      url: this.getUrl(storagePath),
      fileSize: input.buffer.byteLength,
      width: metadata.width,
      height: metadata.height,
    };
  }

  async delete(storagePath: string): Promise<void> {
    const base = storagePath.replace(/-large\.(webp|jpg)$/, "");
    await Promise.all([
      unlink(path.join(UPLOAD_ROOT, `${base}-thumb.webp`)).catch(() => undefined),
      unlink(path.join(UPLOAD_ROOT, `${base}-medium.webp`)).catch(() => undefined),
      unlink(path.join(UPLOAD_ROOT, `${base}-large.webp`)).catch(() => undefined),
      unlink(path.join(UPLOAD_ROOT, `${base}-large.jpg`)).catch(() => undefined),
    ]);
  }

  getUrl(storagePath: string): string {
    return `/uploads/${storagePath}`;
  }

  async replace(oldStoragePath: string, input: UploadInput): Promise<UploadResult> {
    await this.delete(oldStoragePath).catch(() => undefined);
    return this.upload(input);
  }
}
