"use server";

import { requirePermission, requireUserId } from "@/lib/auth/rbac";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { updateClientSchema, type UpdateClientInput } from "@/modules/clients/schemas/client.schema";
import { ClientNotFoundError, ClientService } from "@/modules/clients/services/client.service";

export async function updateClientAction(rawInput: UpdateClientInput) {
  await requireUserId();
  await requirePermission(PERMISSIONS.clients.update);

  const input = updateClientSchema.parse(rawInput);

  try {
    const service = new ClientService();
    const client = await service.update(input);
    return { success: true as const, client };
  } catch (error) {
    if (error instanceof ClientNotFoundError) {
      return { success: false as const, error: error.message };
    }
    throw error;
  }
}
