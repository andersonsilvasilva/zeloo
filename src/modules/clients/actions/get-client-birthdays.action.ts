"use server";

import { requirePermission, requireUserId } from "@/lib/auth/rbac";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { ClientService } from "@/modules/clients/services/client.service";

export async function getClientBirthdaysAction() {
  await requireUserId();
  await requirePermission(PERMISSIONS.clients.view);

  const service = new ClientService();
  return service.getBirthdays();
}
