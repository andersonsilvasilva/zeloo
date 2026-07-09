"use server";

import { requirePermission, requireUserId } from "@/lib/auth/rbac";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { createTemplateSchema, type CreateTemplateInput } from "@/modules/messages/schemas/message.schema";
import { MessageService } from "@/modules/messages/services/message.service";

export async function createTemplateAction(rawInput: CreateTemplateInput) {
  await requireUserId();
  await requirePermission(PERMISSIONS.messages.send);

  const input = createTemplateSchema.parse(rawInput);

  const service = new MessageService();
  const template = await service.createTemplate(input);
  return { success: true as const, template };
}
