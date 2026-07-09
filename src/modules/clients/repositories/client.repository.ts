import type { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { ClientStatus } from "@/modules/clients/schemas/client.schema";

type PrismaOrTx = PrismaClient | Prisma.TransactionClient;

const clientInclude = {
  preferredBarber: { select: { id: true, professionalName: true } },
  profileImage: { select: { storagePath: true } },
} satisfies Prisma.ClientInclude;

export type ClientWithRelations = Prisma.ClientGetPayload<{ include: typeof clientInclude }>;

export class ClientRepository {
  constructor(private readonly db: PrismaOrTx = prisma) {}

  async findById(id: string): Promise<ClientWithRelations | null> {
    return this.db.client.findUnique({ where: { id }, include: clientInclude });
  }

  async list(filters: { search?: string; status?: ClientStatus; preferredBarberId?: string }) {
    return this.db.client.findMany({
      where: {
        status: filters.status,
        preferredBarberId: filters.preferredBarberId,
        ...(filters.search
          ? {
              OR: [
                { name: { contains: filters.search } },
                { phone: { contains: filters.search } },
                { whatsapp: { contains: filters.search } },
                { email: { contains: filters.search } },
              ],
            }
          : {}),
      },
      include: clientInclude,
      orderBy: { name: "asc" },
    });
  }

  async create(data: Prisma.ClientCreateInput): Promise<ClientWithRelations> {
    return this.db.client.create({ data, include: clientInclude });
  }

  async update(id: string, data: Prisma.ClientUpdateInput): Promise<ClientWithRelations> {
    return this.db.client.update({ where: { id }, data, include: clientInclude });
  }

  async delete(id: string): Promise<void> {
    await this.db.client.delete({ where: { id } });
  }

  async countAppointments(id: string): Promise<number> {
    return this.db.appointment.count({ where: { clientId: id } });
  }

  async findMediaById(id: string) {
    return this.db.media.findUnique({ where: { id } });
  }

  async createMedia(data: Prisma.MediaCreateInput) {
    return this.db.media.create({ data });
  }

  async deleteMedia(id: string): Promise<void> {
    await this.db.media.deleteMany({ where: { id } });
  }

  async listActiveBarbersForSelect(): Promise<{ id: string; professionalName: string }[]> {
    return this.db.barber.findMany({
      where: { status: "ACTIVE" },
      select: { id: true, professionalName: true },
      orderBy: { professionalName: "asc" },
    });
  }

  /** Todos os clientes ativos com data de nascimento cadastrada — a classificação por dia/semana/mês é feita no service. */
  async listWithBirthDate() {
    return this.db.client.findMany({
      where: { birthDate: { not: null }, status: { in: ["ACTIVE", "VIP"] } },
      select: { id: true, name: true, phone: true, whatsapp: true, birthDate: true },
    });
  }
}
