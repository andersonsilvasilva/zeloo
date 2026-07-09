"use server";

import { requirePermission, requireUserId } from "@/lib/auth/rbac";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { clientIdSchema, type ClientIdInput } from "@/modules/clients/schemas/client.schema";
import {
  ClientHasAppointmentsError,
  ClientNotFoundError,
  ClientService,
} from "@/modules/clients/services/client.service";

export async function deleteClientAction(rawInput: ClientIdInput) {
  await requireUserId();
  await requirePermission(PERMISSIONS.clients.delete);

  const input = clientIdSchema.parse(rawInput);

  try {
    const service = new ClientService();
    await service.delete(input.id);
    return { success: true as const };
  } catch (error) {
    if (error instanceof ClientHasAppointmentsError || error instanceof ClientNotFoundError) {
      return { success: false as const, error: error.message };
    }
    throw error;
  }
}
