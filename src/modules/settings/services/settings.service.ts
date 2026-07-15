import { getStorageProvider } from "@/lib/storage";
import { SettingsRepository } from "@/modules/settings/repositories/settings.repository";
import { SETTINGS_KEYS, DEFAULT_TIMEZONE } from "@/modules/settings/schemas/settings.schema";
import type { GeneralSettingsInput, MercadoPagoSettingsInput } from "@/modules/settings/schemas/settings.schema";
import type { GeneralSettings, MercadoPagoSettings } from "@/modules/settings/types/settings.types";

/** Mostra só os últimos 4 caracteres — o suficiente pra confirmar "é esse token mesmo" sem expor o segredo. */
function maskSecret(value: string): string {
  if (value.length <= 4) return "••••";
  return `••••${value.slice(-4)}`;
}

const TEXT_KEYS = [
  SETTINGS_KEYS.name,
  SETTINGS_KEYS.phone,
  SETTINGS_KEYS.whatsapp,
  SETTINGS_KEYS.email,
  SETTINGS_KEYS.address,
  SETTINGS_KEYS.googleMapsUrl,
  SETTINGS_KEYS.timezone,
  SETTINGS_KEYS.logoMediaId,
  SETTINGS_KEYS.faviconMediaId,
  SETTINGS_KEYS.ogImageMediaId,
  SETTINGS_KEYS.instagram,
  SETTINGS_KEYS.facebook,
  SETTINGS_KEYS.socialBio,
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

type ImageMediaType = "LOGO" | "FAVICON" | "OG_IMAGE";

const IMAGE_SETTING: Record<ImageMediaType, { key: string; folder: string }> = {
  LOGO: { key: SETTINGS_KEYS.logoMediaId, folder: "logo" },
  FAVICON: { key: SETTINGS_KEYS.faviconMediaId, folder: "favicon" },
  OG_IMAGE: { key: SETTINGS_KEYS.ogImageMediaId, folder: "og-image" },
};

/**
 * Regras de negócio de configurações gerais (identidade visual, fuso
 * horário, dados da barbearia). Persistidas como chave/valor em `Setting`
 * — não há model dedicado hoje (barbearia única, ver README "Multi-Tenant").
 */
export class SettingsService {
  async getGeneralSettings(): Promise<GeneralSettings> {
    const repo = new SettingsRepository();
    const map = await repo.getMany(TEXT_KEYS);
    const storage = getStorageProvider();

    const resolveImageUrl = async (mediaId: string | undefined) => {
      if (!mediaId) return null;
      const media = await repo.findMediaById(mediaId);
      return media ? storage.getUrl(media.storagePath) : null;
    };

    const [logoUrl, faviconUrl, ogImageUrl] = await Promise.all([
      resolveImageUrl(map[SETTINGS_KEYS.logoMediaId]),
      resolveImageUrl(map[SETTINGS_KEYS.faviconMediaId]),
      resolveImageUrl(map[SETTINGS_KEYS.ogImageMediaId]),
    ]);

    return {
      name: map[SETTINGS_KEYS.name] ?? "",
      phone: map[SETTINGS_KEYS.phone] ?? "",
      whatsapp: map[SETTINGS_KEYS.whatsapp] ?? "",
      email: map[SETTINGS_KEYS.email] ?? "",
      address: map[SETTINGS_KEYS.address] ?? "",
      googleMapsUrl: map[SETTINGS_KEYS.googleMapsUrl] ?? "",
      timezone: map[SETTINGS_KEYS.timezone] || DEFAULT_TIMEZONE,
      instagram: map[SETTINGS_KEYS.instagram] ?? "",
      facebook: map[SETTINGS_KEYS.facebook] ?? "",
      socialBio: map[SETTINGS_KEYS.socialBio] ?? "",
      logoUrl,
      faviconUrl,
      ogImageUrl,
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
      { key: SETTINGS_KEYS.googleMapsUrl, value: input.googleMapsUrl ?? "" },
      { key: SETTINGS_KEYS.timezone, value: input.timezone },
      { key: SETTINGS_KEYS.instagram, value: input.instagram ?? "" },
      { key: SETTINGS_KEYS.facebook, value: input.facebook ?? "" },
      { key: SETTINGS_KEYS.socialBio, value: input.socialBio ?? "" },
    ]);

    return this.getGeneralSettings();
  }

  private async updateImage(mediaType: ImageMediaType, file: LogoFileInput): Promise<GeneralSettings> {
    const { key, folder } = IMAGE_SETTING[mediaType];
    const repo = new SettingsRepository();
    const storage = getStorageProvider();

    let uploaded;
    try {
      uploaded = await storage.upload({
        ...file,
        folder,
        largeFormat: mediaType === "OG_IMAGE" ? "jpeg" : "webp",
      });
    } catch (error) {
      console.error(`[SettingsService.updateImage:${mediaType}] falha no storage.upload:`, error);
      throw new LogoUploadError(error instanceof Error ? error.message : "Falha ao enviar a imagem.");
    }

    const media = await repo.createMedia({
      fileName: uploaded.fileName,
      originalName: file.originalName,
      mimeType: file.mimeType,
      fileSize: uploaded.fileSize,
      storageProvider: process.env.STORAGE_PROVIDER ?? "local",
      storagePath: uploaded.storagePath,
      mediaType,
      width: uploaded.width,
      height: uploaded.height,
    });

    const previous = await repo.getMany([key]);
    const previousMediaId = previous[key];

    await repo.upsertMany([{ key, value: media.id }]);

    if (previousMediaId) {
      const previousMedia = await repo.findMediaById(previousMediaId);
      if (previousMedia) {
        await storage.delete(previousMedia.storagePath).catch(() => undefined);
        await repo.deleteMedia(previousMediaId);
      }
    }

    return this.getGeneralSettings();
  }

  private async removeImage(mediaType: ImageMediaType): Promise<GeneralSettings> {
    const { key } = IMAGE_SETTING[mediaType];
    const repo = new SettingsRepository();
    const storage = getStorageProvider();

    const map = await repo.getMany([key]);
    const mediaId = map[key];

    if (mediaId) {
      const media = await repo.findMediaById(mediaId);
      if (media) {
        await storage.delete(media.storagePath).catch(() => undefined);
        await repo.deleteMedia(mediaId);
      }
      await repo.upsertMany([{ key, value: "" }]);
    }

    return this.getGeneralSettings();
  }

  updateLogo(file: LogoFileInput) {
    return this.updateImage("LOGO", file);
  }

  removeLogo() {
    return this.removeImage("LOGO");
  }

  updateFavicon(file: LogoFileInput) {
    return this.updateImage("FAVICON", file);
  }

  removeFavicon() {
    return this.removeImage("FAVICON");
  }

  updateOgImage(file: LogoFileInput) {
    return this.updateImage("OG_IMAGE", file);
  }

  removeOgImage() {
    return this.removeImage("OG_IMAGE");
  }

  async getMercadoPagoSettings(): Promise<MercadoPagoSettings> {
    const repo = new SettingsRepository();
    const map = await repo.getMany([SETTINGS_KEYS.mercadoPagoAccessToken, SETTINGS_KEYS.mercadoPagoWebhookSecret]);
    const accessToken = map[SETTINGS_KEYS.mercadoPagoAccessToken] ?? "";
    const webhookSecret = map[SETTINGS_KEYS.mercadoPagoWebhookSecret] ?? "";

    return {
      accessTokenMasked: accessToken ? maskSecret(accessToken) : null,
      webhookSecretMasked: webhookSecret ? maskSecret(webhookSecret) : null,
      configured: Boolean(accessToken),
    };
  }

  async updateMercadoPagoSettings(input: MercadoPagoSettingsInput): Promise<MercadoPagoSettings> {
    const repo = new SettingsRepository();
    const entries: { key: string; value: string }[] = [];
    // Campo em branco = "não alterar" (ver comentário no schema) — nunca zera um segredo já salvo sem intenção explícita.
    if (input.accessToken) entries.push({ key: SETTINGS_KEYS.mercadoPagoAccessToken, value: input.accessToken });
    if (input.webhookSecret) entries.push({ key: SETTINGS_KEYS.mercadoPagoWebhookSecret, value: input.webhookSecret });
    if (entries.length > 0) await repo.upsertMany(entries);

    return this.getMercadoPagoSettings();
  }

  /**
   * Valores em texto puro — uso exclusivo server-side (cliente Mercado Pago,
   * validação de assinatura do webhook). Nunca expor via Server Action.
   */
  async getMercadoPagoCredentials(): Promise<{ accessToken: string | null; webhookSecret: string | null }> {
    const repo = new SettingsRepository();
    const map = await repo.getMany([SETTINGS_KEYS.mercadoPagoAccessToken, SETTINGS_KEYS.mercadoPagoWebhookSecret]);
    return {
      accessToken: map[SETTINGS_KEYS.mercadoPagoAccessToken] || null,
      webhookSecret: map[SETTINGS_KEYS.mercadoPagoWebhookSecret] || null,
    };
  }
}
