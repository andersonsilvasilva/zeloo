"use server";

import { requirePermission, requireUserId } from "@/lib/auth/rbac";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { MessageService } from "@/modules/messages/services/message.service";

export async function getMessageFormOptionsAction() {
  await requireUserId();
  await requirePermission(PERMISSIONS.messages.send);

  const service = new MessageService();
  return service.getFormOptions();
}
