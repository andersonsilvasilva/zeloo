/**
 * Abstração de armazenamento de arquivos.
 *
 * Nenhum módulo de domínio (barbers, services, settings) deve importar
 * `fs` ou um SDK de storage diretamente — todos usam esta interface,
 * injetada via `getStorageProvider()`.
 *
 * Implementações previstas:
 *  - LocalStorageProvider   (dev, já implementado)
 *  - S3StorageProvider      (produção, futuro)
 *  - R2StorageProvider      (produção, futuro)
 *  - SupabaseStorageProvider (produção, futuro)
 */

export interface UploadInput {
  buffer: Buffer;
  originalName: string;
  mimeType: string;
  /** Pasta lógica dentro do provider, ex: "barbers", "services", "logo" */
  folder: string;
}

export interface UploadResult {
  /** Nome de arquivo gerado (aleatório, nunca o nome original). */
  fileName: string;
  /** Caminho/chave usado pelo provider para localizar o arquivo. */
  storagePath: string;
  /** URL pública (ou assinada) para exibição. */
  url: string;
  fileSize: number;
  width?: number;
  height?: number;
}

export interface StorageProvider {
  upload(input: UploadInput): Promise<UploadResult>;
  delete(storagePath: string): Promise<void>;
  getUrl(storagePath: string): string;
  replace(oldStoragePath: string, input: UploadInput): Promise<UploadResult>;
}
