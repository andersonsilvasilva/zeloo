"use server";

import { requirePermission, requireUserId } from "@/lib/auth/rbac";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { barberIdSchema } from "@/modules/barbers/schemas/barber.schema";
import { BarberService } from "@/modules/barbers/services/barber.service";

const MAX_FILE_SIZE_BYTES = 8 * 1024 * 1024;
const ALLOWED_MIME = new Set(["image/png", "image/jpeg", "image/jpg", "image/webp"]);

export async function updateBarberPhotoAction(formData: FormData) {
  await requireUserId();
  await requirePermission(PERMISSIONS.barbers.update);

  const { id } = barberIdSchema.parse({ id: formData.get("id") });

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
    const service = new BarberService();
    const url = await service.updatePhoto(id, { buffer, originalName: file.name, mimeType: file.type });
    return { success: true as const, url };
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : "Falha ao enviar a foto." };
  }
}
