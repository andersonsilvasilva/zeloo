import type { Prisma } from "@prisma/client";
import { prisma, type PrismaOrTx } from "@/lib/prisma";
import type { ServiceStatus } from "@/modules/services/schemas/service.schema";

const serviceInclude = {
  advertisingImage: { select: { storagePath: true } },
  defaultMessageTemplate: { select: { id: true, name: true } },
  _count: { select: { professionals: true } },
} satisfies Prisma.ServiceInclude;

export type ServiceWithRelations = Prisma.ServiceGetPayload<{ include: typeof serviceInclude }>;

export class ServiceRepository {
  constructor(private readonly db: PrismaOrTx = prisma) {}

  async findById(id: string): Promise<ServiceWithRelations | null> {
    return this.db.service.findUnique({ where: { id }, include: serviceInclude });
  }

  async findBySlug(slug: string) {
    return this.db.service.findUnique({ where: { slug }, select: { id: true } });
  }

  async list(filters: { search?: string; status?: ServiceStatus; category?: string }) {
    return this.db.service.findMany({
      where: {
        status: filters.status,
        category: filters.category,
        ...(filters.search
          ? { OR: [{ name: { contains: filters.search } }, { category: { contains: filters.search } }] }
          : {}),
      },
      include: serviceInclude,
      orderBy: { name: "asc" },
    });
  }

  async create(data: Prisma.ServiceUncheckedCreateInput): Promise<ServiceWithRelations> {
    return this.db.service.create({ data, include: serviceInclude });
  }

  async update(id: string, data: Prisma.ServiceUpdateInput): Promise<ServiceWithRelations> {
    return this.db.service.update({ where: { id }, data, include: serviceInclude });
  }

  async delete(id: string): Promise<void> {
    await this.db.service.delete({ where: { id } });
  }

  async countAppointmentUsage(id: string): Promise<number> {
    return this.db.appointmentService.count({ where: { serviceId: id } });
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

  async setAdvertisingImage(id: string, mediaId: string | null): Promise<void> {
    await this.db.service.update({
      where: { id },
      data: { advertisingImage: mediaId ? { connect: { id: mediaId } } : { disconnect: true } },
    });
  }

  async listActiveMessageTemplatesForSelect() {
    return this.db.messageTemplate.findMany({
      where: { status: "ACTIVE" },
      select: { id: true, name: true, channel: true },
      orderBy: { name: "asc" },
    });
  }

  /** Campos seguros para a vitrine pública de agendamento (`/agendar`) — nada sensível. */
  async listActiveForPublicBooking() {
    return this.db.service.findMany({
      where: { status: "ACTIVE" },
      select: {
        id: true,
        name: true,
        shortDescription: true,
        price: true,
        durationMinutes: true,
        category: true,
        advertisingImage: { select: { storagePath: true } },
      },
      orderBy: { name: "asc" },
    });
  }
}
