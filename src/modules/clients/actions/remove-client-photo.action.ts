"use server";

import { requirePermission, requireUserId } from "@/lib/auth/rbac";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { clientIdSchema, type ClientIdInput } from "@/modules/clients/schemas/client.schema";
import { ClientService } from "@/modules/clients/services/client.service";

export async function removeClientPhotoAction(rawInput: ClientIdInput) {
  await requireUserId();
  await requirePermission(PERMISSIONS.clients.update);

  const input = clientIdSchema.parse(rawInput);

  try {
    const service = new ClientService();
    await service.removePhoto(input.id);
    return { success: true as const, url: null };
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : "Falha ao remover a foto." };
  }
}
