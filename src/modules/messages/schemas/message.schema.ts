import { z } from "zod";

export const messageChannelValues = ["WHATSAPP", "SMS"] as const;
export const messageChannelSchema = z.enum(messageChannelValues);
export type MessageChannel = z.infer<typeof messageChannelSchema>;

export const messageStatusValues = ["QUEUED", "SENT", "DELIVERED", "FAILED"] as const;
export type MessageStatus = (typeof messageStatusValues)[number];

/** MessageTemplate.status reaproveita o enum ServiceStatus do Prisma (ACTIVE/INACTIVE). */
export const templateStatusValues = ["ACTIVE", "INACTIVE"] as const;
export const templateStatusSchema = z.enum(templateStatusValues);
export type TemplateStatus = z.infer<typeof templateStatusSchema>;

export const createTemplateSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome do modelo.").max(150),
  channel: messageChannelSchema,
  content: z.string().trim().min(1, "Informe o conteúdo da mensagem.").max(2000),
  status: templateStatusSchema.default("ACTIVE"),
});

export type CreateTemplateInput = z.infer<typeof createTemplateSchema>;

export const updateTemplateSchema = createTemplateSchema.extend({ id: z.string().cuid() });
export type UpdateTemplateInput = z.infer<typeof updateTemplateSchema>;

export const templateIdSchema = z.object({ id: z.string().cuid() });
export type TemplateIdInput = z.infer<typeof templateIdSchema>;

export const listTemplatesSchema = z.object({
  search: z.string().trim().max(200).optional(),
  channel: messageChannelSchema.optional(),
  status: templateStatusSchema.optional(),
});

export type ListTemplatesInput = z.infer<typeof listTemplatesSchema>;

export const sendMessageSchema = z.object({
  clientId: z.string().cuid(),
  templateId: z.string().cuid(),
  /** Necessário quando o modelo usa {{professional_agendado}} ou {{resumo_agendamento}}. */
  appointmentId: z.string().cuid().optional(),
});

export type SendMessageInput = z.infer<typeof sendMessageSchema>;

export const listMessageLogsSchema = z.object({
  clientId: z.string().cuid().optional(),
  channel: messageChannelSchema.optional(),
});

export type ListMessageLogsInput = z.infer<typeof listMessageLogsSchema>;
