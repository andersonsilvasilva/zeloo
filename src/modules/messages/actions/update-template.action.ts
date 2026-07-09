"use server";

import { requirePermission, requireUserId } from "@/lib/auth/rbac";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { updateTemplateSchema, type UpdateTemplateInput } from "@/modules/messages/schemas/message.schema";
import { MessageService, TemplateNotFoundError } from "@/modules/messages/services/message.service";

export async function updateTemplateAction(rawInput: UpdateTemplateInput) {
  await requireUserId();
  await requirePermission(PERMISSIONS.messages.send);

  const input = updateTemplateSchema.parse(rawInput);

  try {
    const service = new MessageService();
    const template = await service.updateTemplate(input);
    return { success: true as const, template };
  } catch (error) {
    if (error instanceof TemplateNotFoundError) {
      return { success: false as const, error: error.message };
    }
    throw error;
  }
}
