"use server";

import { requirePermission, requireUserId } from "@/lib/auth/rbac";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { sendMessageSchema, type SendMessageInput } from "@/modules/messages/schemas/message.schema";
import {
  AppointmentNotFoundError,
  AppointmentRequiredError,
  ClientNotFoundError,
  ClientPhoneMissingError,
  MessageService,
  TemplateNotFoundError,
} from "@/modules/messages/services/message.service";
import { WhatsAppSendError } from "@/lib/whatsapp/whatsapp-client";

export async function sendMessageAction(rawInput: SendMessageInput) {
  const userId = await requireUserId();
  await requirePermission(PERMISSIONS.messages.send);

  const input = sendMessageSchema.parse(rawInput);

  try {
    const service = new MessageService();
    const log = await service.sendMessage(input, userId);
    return { success: true as const, log };
  } catch (error) {
    if (
      error instanceof TemplateNotFoundError ||
      error instanceof ClientNotFoundError ||
      error instanceof AppointmentNotFoundError ||
      error instanceof AppointmentRequiredError ||
      error instanceof ClientPhoneMissingError ||
      error instanceof WhatsAppSendError
    ) {
      return { success: false as const, error: error.message };
    }
    throw error;
  }
}
