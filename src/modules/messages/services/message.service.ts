import { format } from "date-fns";
import { formatCurrency } from "@/lib/utils/format";
import { sendWhatsAppTemplateMessage } from "@/lib/whatsapp/whatsapp-client";
import { SettingsService } from "@/modules/settings/services/settings.service";
import {
  MessageRepository,
  type AppointmentWithRelations,
  type MessageLogWithRelations,
} from "@/modules/messages/repositories/message.repository";
import type {
  CreateTemplateInput,
  UpdateTemplateInput,
  ListTemplatesInput,
  SendMessageInput,
  ListMessageLogsInput,
} from "@/modules/messages/schemas/message.schema";
import type {
  MessageAppointmentOption,
  MessageFormOptions,
  MessageLogItem,
  MessageTemplateItem,
} from "@/modules/messages/types/message.types";
import type { MessageTemplate } from "@prisma/client";

export class TemplateNotFoundError extends Error {
  constructor() {
    super("Modelo de mensagem não encontrado.");
    this.name = "TemplateNotFoundError";
  }
}

export class ClientNotFoundError extends Error {
  constructor() {
    super("Cliente não encontrado.");
    this.name = "ClientNotFoundError";
  }
}

export class AppointmentNotFoundError extends Error {
  constructor() {
    super("Agendamento não encontrado para este cliente.");
    this.name = "AppointmentNotFoundError";
  }
}

export class AppointmentRequiredError extends Error {
  constructor() {
    super("Este modelo usa dados do agendamento — selecione um agendamento.");
    this.name = "AppointmentRequiredError";
  }
}

export class NoDefaultTemplateError extends Error {
  constructor() {
    super("Nenhum serviço deste agendamento tem um modelo de mensagem padrão configurado.");
    this.name = "NoDefaultTemplateError";
  }
}

export class ClientPhoneMissingError extends Error {
  constructor() {
    super("Este cliente não tem WhatsApp/telefone cadastrado.");
    this.name = "ClientPhoneMissingError";
  }
}

/** Placeholders que dependem de um agendamento vinculado (ver {{clientName}}, sempre disponível). */
const APPOINTMENT_PLACEHOLDERS = ["{{barber_agendado}}", "{{resumo_agendamento}}"];

/**
 * Regras de negócio de mensagens (templates + envio + histórico).
 * Canal WHATSAPP envia de verdade via WhatsApp Cloud API (ver
 * lib/whatsapp/whatsapp-client.ts); SMS (Twilio/Zenvia) ainda não está
 * integrado e continua apenas registrando o histórico como SENT.
 */
export class MessageService {
  async listTemplates(filters: ListTemplatesInput): Promise<MessageTemplateItem[]> {
    const repo = new MessageRepository();
    const templates = await repo.listTemplates(filters);
    return templates.map((t) => this.toTemplateItem(t));
  }

  async getTemplateById(id: string): Promise<MessageTemplateItem> {
    const repo = new MessageRepository();
    const template = await repo.findTemplateById(id);
    if (!template) throw new TemplateNotFoundError();
    return this.toTemplateItem(template);
  }

  async createTemplate(input: CreateTemplateInput): Promise<MessageTemplateItem> {
    const repo = new MessageRepository();
    const template = await repo.createTemplate({
      name: input.name,
      channel: input.channel,
      content: input.content,
      status: input.status,
    });
    return this.toTemplateItem(template);
  }

  async updateTemplate(input: UpdateTemplateInput): Promise<MessageTemplateItem> {
    const repo = new MessageRepository();
    const existing = await repo.findTemplateById(input.id);
    if (!existing) throw new TemplateNotFoundError();

    const template = await repo.updateTemplate(input.id, {
      name: input.name,
      channel: input.channel,
      content: input.content,
      status: input.status,
    });
    return this.toTemplateItem(template);
  }

  async deleteTemplate(id: string): Promise<void> {
    const repo = new MessageRepository();
    const existing = await repo.findTemplateById(id);
    if (!existing) throw new TemplateNotFoundError();
    await repo.deleteTemplate(id);
  }

  async listLogs(filters: ListMessageLogsInput): Promise<MessageLogItem[]> {
    const repo = new MessageRepository();
    const logs = await repo.listLogs(filters);
    return logs.map((l) => this.toLogItem(l));
  }

  async sendMessage(input: SendMessageInput, userId: string): Promise<MessageLogItem> {
    const repo = new MessageRepository();

    const template = await repo.findTemplateById(input.templateId);
    if (!template || template.status !== "ACTIVE") throw new TemplateNotFoundError();

    const client = await repo.findClientById(input.clientId);
    if (!client) throw new ClientNotFoundError();

    const needsAppointment = APPOINTMENT_PLACEHOLDERS.some((placeholder) => template.content.includes(placeholder));

    let appointment: AppointmentWithRelations | null = null;
    if (input.appointmentId) {
      appointment = await repo.findAppointmentForClient(input.appointmentId, input.clientId);
      if (!appointment) throw new AppointmentNotFoundError();
    } else if (needsAppointment) {
      throw new AppointmentRequiredError();
    }

    const content = this.renderTemplate(template.content, client.name, appointment);

    let providerRef: string | undefined;
    if (template.channel === "WHATSAPP") {
      const to = client.whatsapp || client.phone;
      if (!to) throw new ClientPhoneMissingError();

      // Variáveis {{1}}..{{5}} do template "confirmacao_agendamento" — só
      // fazem sentido quando há um agendamento vinculado ao envio.
      let parameters: string[] | undefined;
      if (appointment) {
        const settings = await new SettingsService().getGeneralSettings();
        parameters = [
          client.name,
          settings.name,
          format(appointment.startTime, "dd/MM/yyyy 'às' HH:mm"),
          appointment.barber.professionalName,
          appointment.services.map((s) => s.service.name).join(", "),
        ];
      }

      const result = await sendWhatsAppTemplateMessage({ to, parameters });
      providerRef = result.providerRef;
    }

    const log = await repo.createLog({
      client: { connect: { id: client.id } },
      template: { connect: { id: template.id } },
      channel: template.channel,
      content,
      status: "SENT",
      providerRef,
      sentBy: { connect: { id: userId } },
    });

    return this.toLogItem(log);
  }

  /**
   * Envia (ou simula, ver nota da classe) a confirmação de um agendamento,
   * usando o modelo padrão configurado no primeiro serviço do agendamento
   * que tiver um definido (ver Service.defaultMessageTemplateId).
   * Usada tanto pelo botão manual (Agenda) quanto pelo envio automático ao criar o agendamento.
   */
  async sendAppointmentConfirmation(appointmentId: string, userId: string): Promise<MessageLogItem> {
    const repo = new MessageRepository();

    const appointment = await repo.findAppointmentForConfirmation(appointmentId);
    if (!appointment) throw new AppointmentNotFoundError();

    const templateId = appointment.services
      .map((s) => s.service.defaultMessageTemplateId)
      .find((id): id is string => Boolean(id));
    if (!templateId) throw new NoDefaultTemplateError();

    return this.sendMessage({ clientId: appointment.clientId, templateId, appointmentId }, userId);
  }

  async getClientAppointments(clientId: string): Promise<MessageAppointmentOption[]> {
    const repo = new MessageRepository();
    const appointments = await repo.listClientAppointments(clientId);
    return appointments.map((a) => this.toAppointmentOption(a));
  }

  async getFormOptions(): Promise<MessageFormOptions> {
    const repo = new MessageRepository();
    const [clients, templates] = await Promise.all([
      repo.listActiveClientsForSelect(),
      repo.listTemplates({ status: "ACTIVE" }),
    ]);
    return { clients, templates: templates.map((t) => this.toTemplateItem(t)) };
  }

  private toTemplateItem(template: MessageTemplate): MessageTemplateItem {
    return {
      id: template.id,
      name: template.name,
      channel: template.channel,
      content: template.content,
      status: template.status,
    };
  }

  private toLogItem(log: MessageLogWithRelations): MessageLogItem {
    return {
      id: log.id,
      client: log.client,
      template: log.template,
      channel: log.channel,
      content: log.content,
      status: log.status,
      sentBy: log.sentBy,
      createdAt: log.createdAt,
    };
  }

  private toAppointmentOption(appointment: AppointmentWithRelations): MessageAppointmentOption {
    return {
      id: appointment.id,
      startTime: appointment.startTime,
      barberName: appointment.barber.professionalName,
      servicesLabel: appointment.services.map((s) => s.service.name).join(", "),
      totalPrice: appointment.services.reduce((sum, s) => sum + s.price.toNumber(), 0),
    };
  }

  private buildAppointmentSummary(appointment: AppointmentWithRelations): string {
    const services = appointment.services.map((s) => s.service.name).join(", ");
    const total = appointment.services.reduce((sum, s) => sum + s.price.toNumber(), 0);
    const when = format(appointment.startTime, "dd/MM/yyyy 'às' HH:mm");
    return `${services} — ${when} — ${formatCurrency(total)}`;
  }

  private renderTemplate(content: string, clientName: string, appointment: AppointmentWithRelations | null): string {
    let rendered = content.replaceAll("{{clientName}}", clientName);
    if (appointment) {
      rendered = rendered
        .replaceAll("{{barber_agendado}}", appointment.barber.professionalName)
        .replaceAll("{{resumo_agendamento}}", this.buildAppointmentSummary(appointment));
    }
    return rendered;
  }
}
