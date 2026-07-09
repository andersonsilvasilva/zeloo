"use server";

import { requirePermission, requireUserId } from "@/lib/auth/rbac";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { createClientSchema, type CreateClientInput } from "@/modules/clients/schemas/client.schema";
import { ClientService } from "@/modules/clients/services/client.service";

export async function createClientAction(rawInput: CreateClientInput) {
  await requireUserId();
  await requirePermission(PERMISSIONS.clients.create);

  const input = createClientSchema.parse(rawInput);

  const service = new ClientService();
  const client = await service.create(input);
  return { success: true as const, client };
}
