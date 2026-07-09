"use server";

import { requirePermission, requireUserId } from "@/lib/auth/rbac";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { clientIdSchema, type ClientIdInput } from "@/modules/clients/schemas/client.schema";
import { ClientService } from "@/modules/clients/services/client.service";

export async function getClientAction(rawInput: ClientIdInput) {
  await requireUserId();
  await requirePermission(PERMISSIONS.clients.view);

  const input = clientIdSchema.parse(rawInput);

  const service = new ClientService();
  return service.getById(input.id);
}
