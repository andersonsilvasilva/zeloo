"use server";

import { requirePermission, requireUserId } from "@/lib/auth/rbac";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { listClientsSchema, type ListClientsInput } from "@/modules/clients/schemas/client.schema";
import { ClientService } from "@/modules/clients/services/client.service";

export async function listClientsAction(rawInput: ListClientsInput) {
  await requireUserId();
  await requirePermission(PERMISSIONS.clients.view);

  const input = listClientsSchema.parse(rawInput);

  const service = new ClientService();
  return service.list(input);
}
