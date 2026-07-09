"use server";

import { requirePermission, requireUserId } from "@/lib/auth/rbac";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { listMessageLogsSchema, type ListMessageLogsInput } from "@/modules/messages/schemas/message.schema";
import { MessageService } from "@/modules/messages/services/message.service";

export async function listMessageLogsAction(rawInput: ListMessageLogsInput) {
  await requireUserId();
  await requirePermission(PERMISSIONS.messages.send);

  const input = listMessageLogsSchema.parse(rawInput);

  const service = new MessageService();
  return service.listLogs(input);
}
