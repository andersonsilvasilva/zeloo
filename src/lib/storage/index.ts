import type { StorageProvider } from "@/lib/storage/storage-provider";
import { LocalStorageProvider } from "@/lib/storage/local-storage-provider";

/**
 * Fábrica do provider ativo, baseada em STORAGE_PROVIDER (.env).
 * Troque para "s3" | "r2" | "supabase" quando as implementações
 * correspondentes existirem — nenhum código de domínio muda.
 */
export function getStorageProvider(): StorageProvider {
  const provider = process.env.STORAGE_PROVIDER ?? "local";

  switch (provider) {
    case "local":
      return new LocalStorageProvider();
    // case "s3": return new S3StorageProvider();
    // case "r2": return new R2StorageProvider();
    // case "supabase": return new SupabaseStorageProvider();
    default:
      throw new Error(`Storage provider desconhecido: ${provider}`);
  }
}
