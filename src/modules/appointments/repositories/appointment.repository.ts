import type { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { AppointmentStatus } from "@/modules/appointments/schemas/appointment.schema";

/** Cliente Prisma ou uma transação ($transaction callback) — permite reuso dentro de tx. */
type PrismaOrTx = PrismaClient | Prisma.TransactionClient;

const appointmentInclude = {
  client: { select: { id: true, name: true } },
  barber: { select: { id: true, professionalName: true } },
  createdBy: { select: { id: true, name: true } },
  services: { include: { service: { select: { id: true, name: true } } } },
} satisfies Prisma.AppointmentInclude;

export type AppointmentWithRelations = Prisma.AppointmentGetPayload<{ include: typeof appointmentInclude }>;

export class AppointmentRepository {
  constructor(private readonly db: PrismaOrTx = prisma) {}

  /**
   * Verifica sobreposição de horário para um barbeiro.
   * Regra (spec item 17): existing.startTime < new.endTime AND existing.endTime > new.startTime
   * Considera apenas agendamentos ativos (não cancelados / não-comparecimento).
   */
  async hasConflict(params: {
    barberId: string;
    startTime: Date;
    endTime: Date;
    excludeAppointmentId?: string;
  }) {
    const conflict = await this.db.appointment.findFirst({
      where: {
        barberId: params.barberId,
        id: params.excludeAppointmentId ? { not: params.excludeAppointmentId } : undefined,
        status: { notIn: ["CANCELLED", "NO_SHOW"] },
        startTime: { lt: params.endTime },
        endTime: { gt: params.startTime },
      },
      select: { id: true },
    });

    return Boolean(conflict);
  }

  async findById(id: string): Promise<AppointmentWithRelations | null> {
    return this.db.appointment.findUnique({
      where: { id },
      include: appointmentInclude,
    });
  }

  async list(filters: {
    dateFrom?: Date;
    dateTo?: Date;
    barberId?: string;
    clientId?: string;
    status?: AppointmentStatus;
  }): Promise<AppointmentWithRelations[]> {
    return this.db.appointment.findMany({
      where: {
        barberId: filters.barberId,
        clientId: filters.clientId,
        status: filters.status,
        appointmentDate:
          filters.dateFrom || filters.dateTo
            ? { gte: filters.dateFrom, lte: filters.dateTo }
            : undefined,
      },
      include: appointmentInclude,
      orderBy: { startTime: "asc" },
    });
  }

  async updateStatus(id: string, status: AppointmentStatus) {
    return this.db.appointment.update({ where: { id }, data: { status } });
  }

  /** Reagenda um agendamento existente, substituindo os serviços vinculados. */
  async reschedule(params: {
    id: string;
    barberId: string;
    appointmentDate: Date;
    startTime: Date;
    endTime: Date;
    notes?: string;
    services: { serviceId: string; price: Prisma.Decimal | number; durationMinutes: number }[];
  }) {
    return this.db.appointment.update({
      where: { id: params.id },
      data: {
        barberId: params.barberId,
        appointmentDate: params.appointmentDate,
        startTime: params.startTime,
        endTime: params.endTime,
        notes: params.notes,
        services: {
          deleteMany: {},
          create: params.services,
        },
      },
      include: appointmentInclude,
    });
  }

  async findActiveAppointmentsForBarberOnDate(
    barberId: string,
    dayStart: Date,
    dayEnd: Date,
    excludeAppointmentId?: string,
  ) {
    return this.db.appointment.findMany({
      where: {
        barberId,
        id: excludeAppointmentId ? { not: excludeAppointmentId } : undefined,
        status: { notIn: ["CANCELLED", "NO_SHOW"] },
        startTime: { gte: dayStart, lt: dayEnd },
      },
      select: { startTime: true, endTime: true },
    });
  }

  /** Barbeiro vinculado ao usuário logado, se houver — usado para restringir a própria agenda. */
  async findBarberIdByUserId(userId: string): Promise<{ id: string } | null> {
    return this.db.barber.findUnique({ where: { userId }, select: { id: true } });
  }

  async findBarberById(barberId: string) {
    return this.db.barber.findUnique({
      where: { id: barberId },
      select: { id: true, professionalName: true, workingHours: true, status: true },
    });
  }

  async findServicesByIds(serviceIds: string[]) {
    return this.db.service.findMany({
      where: { id: { in: serviceIds }, status: "ACTIVE" },
    });
  }

  async listActiveServices() {
    return this.db.service.findMany({
      where: { status: "ACTIVE" },
      select: { id: true, name: true, price: true, durationMinutes: true },
      orderBy: { name: "asc" },
    });
  }

  async listActiveBarbersWithServices() {
    return this.db.barber.findMany({
      where: { status: "ACTIVE" },
      select: {
        id: true,
        professionalName: true,
        services: { where: { status: "ACTIVE" }, select: { serviceId: true } },
      },
      orderBy: { professionalName: "asc" },
    });
  }

  async listActiveClients() {
    return this.db.client.findMany({
      where: { status: { in: ["ACTIVE", "VIP"] } },
      select: { id: true, name: true, phone: true },
      orderBy: { name: "asc" },
    });
  }
}
