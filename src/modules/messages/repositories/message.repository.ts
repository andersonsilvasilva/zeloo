import type { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { MessageChannel, TemplateStatus } from "@/modules/messages/schemas/message.schema";

type PrismaOrTx = PrismaClient | Prisma.TransactionClient;

const logInclude = {
  client: { select: { id: true, name: true } },
  template: { select: { id: true, name: true } },
  sentBy: { select: { id: true, name: true } },
} satisfies Prisma.MessageLogInclude;

export type MessageLogWithRelations = Prisma.MessageLogGetPayload<{ include: typeof logInclude }>;

const appointmentInclude = {
  barber: { select: { professionalName: true } },
  services: { include: { service: { select: { name: true } } } },
} satisfies Prisma.AppointmentInclude;

export type AppointmentWithRelations = Prisma.AppointmentGetPayload<{ include: typeof appointmentInclude }>;

export class MessageRepository {
  constructor(private readonly db: PrismaOrTx = prisma) {}

  async listTemplates(filters: { search?: string; channel?: MessageChannel; status?: TemplateStatus }) {
    return this.db.messageTemplate.findMany({
      where: {
        channel: filters.channel,
        status: filters.status,
        ...(filters.search ? { name: { contains: filters.search } } : {}),
      },
      orderBy: { name: "asc" },
    });
  }

  async findTemplateById(id: string) {
    return this.db.messageTemplate.findUnique({ where: { id } });
  }

  async createTemplate(data: Prisma.MessageTemplateCreateInput) {
    return this.db.messageTemplate.create({ data });
  }

  async updateTemplate(id: string, data: Prisma.MessageTemplateUpdateInput) {
    return this.db.messageTemplate.update({ where: { id }, data });
  }

  async deleteTemplate(id: string): Promise<void> {
    await this.db.messageTemplate.delete({ where: { id } });
  }

  async listLogs(filters: { clientId?: string; channel?: MessageChannel }): Promise<MessageLogWithRelations[]> {
    return this.db.messageLog.findMany({
      where: { clientId: filters.clientId, channel: filters.channel },
      include: logInclude,
      orderBy: { createdAt: "desc" },
      take: 100,
    });
  }

  async createLog(data: Prisma.MessageLogCreateInput): Promise<MessageLogWithRelations> {
    return this.db.messageLog.create({ data, include: logInclude });
  }

  async findClientById(id: string) {
    return this.db.client.findUnique({ where: { id }, select: { id: true, name: true, phone: true } });
  }

  async listActiveClientsForSelect() {
    return this.db.client.findMany({
      where: { status: { in: ["ACTIVE", "VIP"] } },
      select: { id: true, name: true, phone: true },
      orderBy: { name: "asc" },
    });
  }

  async listClientAppointments(clientId: string): Promise<AppointmentWithRelations[]> {
    return this.db.appointment.findMany({
      where: { clientId, status: { not: "CANCELLED" } },
      include: appointmentInclude,
      orderBy: { startTime: "desc" },
      take: 20,
    });
  }

  /** Escopado por clientId para garantir que o agendamento realmente pertence ao cliente selecionado. */
  async findAppointmentForClient(appointmentId: string, clientId: string): Promise<AppointmentWithRelations | null> {
    return this.db.appointment.findFirst({
      where: { id: appointmentId, clientId },
      include: appointmentInclude,
    });
  }

  /** Usado para descobrir o modelo padrão a enviar (primeiro serviço do agendamento que tiver um configurado). */
  async findAppointmentForConfirmation(appointmentId: string) {
    return this.db.appointment.findUnique({
      where: { id: appointmentId },
      select: {
        id: true,
        clientId: true,
        services: { select: { service: { select: { defaultMessageTemplateId: true } } } },
      },
    });
  }
}
