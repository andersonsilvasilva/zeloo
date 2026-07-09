"use server";

import { requirePermission, requireUserId } from "@/lib/auth/rbac";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { listTemplatesSchema, type ListTemplatesInput } from "@/modules/messages/schemas/message.schema";
import { MessageService } from "@/modules/messages/services/message.service";

export async function listTemplatesAction(rawInput: ListTemplatesInput) {
  await requireUserId();
  await requirePermission(PERMISSIONS.messages.send);

  const input = listTemplatesSchema.parse(rawInput);

  const service = new MessageService();
  return service.listTemplates(input);
}
