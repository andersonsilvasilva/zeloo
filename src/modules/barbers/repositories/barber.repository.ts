import type { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { BarberStatus } from "@/modules/barbers/schemas/barber.schema";

type PrismaOrTx = PrismaClient | Prisma.TransactionClient;

const barberInclude = {
  profileImage: { select: { storagePath: true } },
  services: { where: { status: "ACTIVE" }, select: { serviceId: true } },
} satisfies Prisma.BarberInclude;

export type BarberWithRelations = Prisma.BarberGetPayload<{ include: typeof barberInclude }>;

export class BarberRepository {
  constructor(private readonly db: PrismaOrTx = prisma) {}

  async findById(id: string): Promise<BarberWithRelations | null> {
    return this.db.barber.findUnique({ where: { id }, include: barberInclude });
  }

  async list(filters: { search?: string; status?: BarberStatus }) {
    return this.db.barber.findMany({
      where: {
        status: filters.status,
        ...(filters.search
          ? {
              OR: [
                { fullName: { contains: filters.search } },
                { professionalName: { contains: filters.search } },
                { phone: { contains: filters.search } },
                { email: { contains: filters.search } },
              ],
            }
          : {}),
      },
      include: barberInclude,
      orderBy: { professionalName: "asc" },
    });
  }

  /** Cria o barbeiro e já vincula os serviços oferecidos, em uma única transação. */
  async create(data: Prisma.BarberCreateInput, serviceIds: string[]): Promise<BarberWithRelations> {
    return prisma.$transaction(async (tx) => {
      const barber = await tx.barber.create({ data });
      if (serviceIds.length > 0) {
        await tx.barberService.createMany({
          data: serviceIds.map((serviceId) => ({ barberId: barber.id, serviceId })),
        });
      }
      return tx.barber.findUniqueOrThrow({ where: { id: barber.id }, include: barberInclude });
    });
  }

  /** Atualiza o barbeiro e substitui a lista de serviços oferecidos. */
  async update(id: string, data: Prisma.BarberUpdateInput, serviceIds: string[]): Promise<BarberWithRelations> {
    return prisma.$transaction(async (tx) => {
      await tx.barber.update({ where: { id }, data });
      await tx.barberService.deleteMany({ where: { barberId: id } });
      if (serviceIds.length > 0) {
        await tx.barberService.createMany({
          data: serviceIds.map((serviceId) => ({ barberId: id, serviceId })),
        });
      }
      return tx.barber.findUniqueOrThrow({ where: { id }, include: barberInclude });
    });
  }

  async delete(id: string): Promise<void> {
    await this.db.barber.delete({ where: { id } });
  }

  async countAppointments(id: string): Promise<number> {
    return this.db.appointment.count({ where: { barberId: id } });
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

  async setProfileImage(id: string, mediaId: string | null): Promise<void> {
    await this.db.barber.update({
      where: { id },
      data: { profileImage: mediaId ? { connect: { id: mediaId } } : { disconnect: true } },
    });
  }

  async listActiveServicesForSelect(): Promise<{ id: string; name: string }[]> {
    return this.db.service.findMany({
      where: { status: "ACTIVE" },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });
  }

  /** Campos seguros para a vitrine pública de agendamento (`/agendar`) — nada sensível. */
  async listActiveForPublicBooking() {
    return this.db.barber.findMany({
      where: { status: "ACTIVE" },
      select: {
        id: true,
        fullName: true,
        professionalName: true,
        bio: true,
        profileImage: { select: { storagePath: true } },
      },
      orderBy: { professionalName: "asc" },
    });
  }

  /** Perfil público de um profissional + os serviços ativos que ele oferece (página `/agendar/profissional`). */
  async findActiveForPublicBookingById(id: string) {
    return this.db.barber.findFirst({
      where: { id, status: "ACTIVE" },
      select: {
        id: true,
        fullName: true,
        professionalName: true,
        bio: true,
        profileImage: { select: { storagePath: true } },
        services: {
          where: { status: "ACTIVE", service: { status: "ACTIVE" } },
          select: {
            service: {
              select: {
                id: true,
                name: true,
                shortDescription: true,
                price: true,
                durationMinutes: true,
                category: true,
                advertisingImage: { select: { storagePath: true } },
              },
            },
          },
        },
      },
    });
  }
}
