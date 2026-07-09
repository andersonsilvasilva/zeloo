"use server";

import { requirePermission, requireUserId } from "@/lib/auth/rbac";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { templateIdSchema, type TemplateIdInput } from "@/modules/messages/schemas/message.schema";
import { MessageService, TemplateNotFoundError } from "@/modules/messages/services/message.service";

export async function deleteTemplateAction(rawInput: TemplateIdInput) {
  await requireUserId();
  await requirePermission(PERMISSIONS.messages.send);

  const input = templateIdSchema.parse(rawInput);

  try {
    const service = new MessageService();
    await service.deleteTemplate(input.id);
    return { success: true as const };
  } catch (error) {
    if (error instanceof TemplateNotFoundError) {
      return { success: false as const, error: error.message };
    }
    throw error;
  }
}
