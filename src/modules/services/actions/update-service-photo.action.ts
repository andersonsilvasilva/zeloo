"use server";

import { requirePermission, requireUserId } from "@/lib/auth/rbac";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { serviceIdSchema } from "@/modules/services/schemas/service.schema";
import { ServiceService } from "@/modules/services/services/service.service";

const MAX_FILE_SIZE_BYTES = 8 * 1024 * 1024;
const ALLOWED_MIME = new Set(["image/png", "image/jpeg", "image/jpg", "image/webp"]);

export async function updateServicePhotoAction(formData: FormData) {
  await requireUserId();
  await requirePermission(PERMISSIONS.services.update);

  const { id } = serviceIdSchema.parse({ id: formData.get("id") });

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
    const service = new ServiceService();
    const url = await service.updatePhoto(id, { buffer, originalName: file.name, mimeType: file.type });
    return { success: true as const, url };
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : "Falha ao enviar a imagem." };
  }
}
