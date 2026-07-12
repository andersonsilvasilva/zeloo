import type { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { ProfessionalStatus } from "@/modules/professionals/schemas/professional.schema";

type PrismaOrTx = PrismaClient | Prisma.TransactionClient;

const professionalInclude = {
  profileImage: { select: { storagePath: true } },
  services: { where: { status: "ACTIVE" }, select: { serviceId: true } },
} satisfies Prisma.ProfessionalInclude;

export type ProfessionalWithRelations = Prisma.ProfessionalGetPayload<{ include: typeof professionalInclude }>;

export class ProfessionalRepository {
  constructor(private readonly db: PrismaOrTx = prisma) {}

  async findById(id: string): Promise<ProfessionalWithRelations | null> {
    return this.db.professional.findUnique({ where: { id }, include: professionalInclude });
  }

  async list(filters: { search?: string; status?: ProfessionalStatus }) {
    return this.db.professional.findMany({
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
      include: professionalInclude,
      orderBy: { professionalName: "asc" },
    });
  }

  /** Cria o profissional e já vincula os serviços oferecidos, em uma única transação. */
  async create(data: Prisma.ProfessionalCreateInput, serviceIds: string[]): Promise<ProfessionalWithRelations> {
    return prisma.$transaction(async (tx) => {
      const professional = await tx.professional.create({ data });
      if (serviceIds.length > 0) {
        await tx.professionalService.createMany({
          data: serviceIds.map((serviceId) => ({ professionalId: professional.id, serviceId })),
        });
      }
      return tx.professional.findUniqueOrThrow({ where: { id: professional.id }, include: professionalInclude });
    });
  }

  /** Atualiza o profissional e substitui a lista de serviços oferecidos. */
  async update(id: string, data: Prisma.ProfessionalUpdateInput, serviceIds: string[]): Promise<ProfessionalWithRelations> {
    return prisma.$transaction(async (tx) => {
      await tx.professional.update({ where: { id }, data });
      await tx.professionalService.deleteMany({ where: { professionalId: id } });
      if (serviceIds.length > 0) {
        await tx.professionalService.createMany({
          data: serviceIds.map((serviceId) => ({ professionalId: id, serviceId })),
        });
      }
      return tx.professional.findUniqueOrThrow({ where: { id }, include: professionalInclude });
    });
  }

  async delete(id: string): Promise<void> {
    await this.db.professional.delete({ where: { id } });
  }

  async countAppointments(id: string): Promise<number> {
    return this.db.appointment.count({ where: { professionalId: id } });
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
    await this.db.professional.update({
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
    return this.db.professional.findMany({
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
    return this.db.professional.findFirst({
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
