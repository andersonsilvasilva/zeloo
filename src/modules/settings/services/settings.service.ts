import { getStorageProvider } from "@/lib/storage";
import { SettingsRepository } from "@/modules/settings/repositories/settings.repository";
import { SETTINGS_KEYS, DEFAULT_TIMEZONE } from "@/modules/settings/schemas/settings.schema";
import type { GeneralSettingsInput } from "@/modules/settings/schemas/settings.schema";
import type { GeneralSettings } from "@/modules/settings/types/settings.types";

const TEXT_KEYS = [
  SETTINGS_KEYS.name,
  SETTINGS_KEYS.phone,
  SETTINGS_KEYS.whatsapp,
  SETTINGS_KEYS.email,
  SETTINGS_KEYS.address,
  SETTINGS_KEYS.timezone,
  SETTINGS_KEYS.logoMediaId,
];

export class LogoUploadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LogoUploadError";
  }
}

export interface LogoFileInput {
  buffer: Buffer;
  originalName: string;
  mimeType: string;
}

/**
 * Regras de negócio de configurações gerais (identidade visual, fuso
 * horário, dados da barbearia). Persistidas como chave/valor em `Setting`
 * — não há model dedicado hoje (barbearia única, ver README "Multi-Tenant").
 */
export class SettingsService {
  async getGeneralSettings(): Promise<GeneralSettings> {
    const repo = new SettingsRepository();
    const map = await repo.getMany(TEXT_KEYS);

    let logoUrl: string | null = null;
    const logoMediaId = map[SETTINGS_KEYS.logoMediaId];
    if (logoMediaId) {
      const media = await repo.findMediaById(logoMediaId);
      if (media) logoUrl = getStorageProvider().getUrl(media.storagePath);
    }

    return {
      name: map[SETTINGS_KEYS.name] ?? "",
      phone: map[SETTINGS_KEYS.phone] ?? "",
      whatsapp: map[SETTINGS_KEYS.whatsapp] ?? "",
      email: map[SETTINGS_KEYS.email] ?? "",
      address: map[SETTINGS_KEYS.address] ?? "",
      timezone: map[SETTINGS_KEYS.timezone] || DEFAULT_TIMEZONE,
      logoUrl,
    };
  }

  async updateGeneralSettings(input: GeneralSettingsInput): Promise<GeneralSettings> {
    const repo = new SettingsRepository();
    await repo.upsertMany([
      { key: SETTINGS_KEYS.name, value: input.name },
      { key: SETTINGS_KEYS.phone, value: input.phone ?? "" },
      { key: SETTINGS_KEYS.whatsapp, value: input.whatsapp ?? "" },
      { key: SETTINGS_KEYS.email, value: input.email ?? "" },
      { key: SETTINGS_KEYS.address, value: input.address ?? "" },
      { key: SETTINGS_KEYS.timezone, value: input.timezone },
    ]);

    return this.getGeneralSettings();
  }

  async updateLogo(file: LogoFileInput): Promise<GeneralSettings> {
    const repo = new SettingsRepository();
    const storage = getStorageProvider();

    let uploaded;
    try {
      uploaded = await storage.upload({ ...file, folder: "logo" });
    } catch (error) {
      throw new LogoUploadError(error instanceof Error ? error.message : "Falha ao enviar a imagem.");
    }

    const media = await repo.createMedia({
      fileName: uploaded.fileName,
      originalName: file.originalName,
      mimeType: file.mimeType,
      fileSize: uploaded.fileSize,
      storageProvider: process.env.STORAGE_PROVIDER ?? "local",
      storagePath: uploaded.storagePath,
      mediaType: "LOGO",
      width: uploaded.width,
      height: uploaded.height,
    });

    const previous = await repo.getMany([SETTINGS_KEYS.logoMediaId]);
    const previousMediaId = previous[SETTINGS_KEYS.logoMediaId];

    await repo.upsertMany([{ key: SETTINGS_KEYS.logoMediaId, value: media.id }]);

    if (previousMediaId) {
      const previousMedia = await repo.findMediaById(previousMediaId);
      if (previousMedia) {
        await storage.delete(previousMedia.storagePath).catch(() => undefined);
        await repo.deleteMedia(previousMediaId);
      }
    }

    return this.getGeneralSettings();
  }

  async removeLogo(): Promise<GeneralSettings> {
    const repo = new SettingsRepository();
    const storage = getStorageProvider();

    const map = await repo.getMany([SETTINGS_KEYS.logoMediaId]);
    const logoMediaId = map[SETTINGS_KEYS.logoMediaId];

    if (logoMediaId) {
      const media = await repo.findMediaById(logoMediaId);
      if (media) {
        await storage.delete(media.storagePath).catch(() => undefined);
        await repo.deleteMedia(logoMediaId);
      }
      await repo.upsertMany([{ key: SETTINGS_KEYS.logoMediaId, value: "" }]);
    }

    return this.getGeneralSettings();
  }
}
