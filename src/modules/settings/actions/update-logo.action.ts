"use server";

import { requirePermission, requireUserId } from "@/lib/auth/rbac";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { LogoUploadError, SettingsService } from "@/modules/settings/services/settings.service";

const MAX_FILE_SIZE_BYTES = 8 * 1024 * 1024;
const ALLOWED_MIME = new Set(["image/png", "image/jpeg", "image/jpg", "image/webp"]);

/** Recebe FormData (não JSON) pois o payload é um arquivo binário. */
export async function updateLogoAction(formData: FormData) {
  await requireUserId();
  await requirePermission(PERMISSIONS.settings.update);

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { success: false as const, error: "Selecione uma imagem." };
  }
  if (!ALLOWED_MIME.has(file.type)) {
    return { success: false as const, error: "Formato não permitido. Use PNG, JPG ou WEBP." };
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return { success: false as const, error: "Arquivo excede o tamanho máximo de 8MB." };
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  try {
    const service = new SettingsService();
    const settings = await service.updateLogo({ buffer, originalName: file.name, mimeType: file.type });
    return { success: true as const, settings };
  } catch (error) {
    if (error instanceof LogoUploadError) {
      return { success: false as const, error: error.message };
    }
    throw error;
  }
}
