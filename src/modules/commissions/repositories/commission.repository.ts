import type { Prisma } from "@prisma/client";
import { prisma, type PrismaOrTx } from "@/lib/prisma";

const closingInclude = {
  professional: { select: { id: true, professionalName: true } },
  closedBy: { select: { id: true, name: true } },
} satisfies Prisma.CommissionClosingInclude;

export type CommissionClosingWithRelations = Prisma.CommissionClosingGetPayload<{ include: typeof closingInclude }>;

export class CommissionRepository {
  constructor(private readonly db: PrismaOrTx = prisma) {}

  async listActiveProfessionals() {
    return this.db.professional.findMany({
      where: { status: "ACTIVE" },
      select: { id: true, professionalName: true, commissionPercentage: true },
      orderBy: { professionalName: "asc" },
    });
  }

  async findProfessionalById(id: string) {
    return this.db.professional.findUnique({
      where: { id },
      select: { id: true, professionalName: true, commissionPercentage: true },
    });
  }

  async findClosingForPeriod(professionalId: string, periodStart: Date, periodEnd: Date) {
    return this.db.commissionClosing.findUnique({
      where: { professionalId_periodStart_periodEnd: { professionalId, periodStart, periodEnd } },
    });
  }

  async createClosing(data: Prisma.CommissionClosingCreateInput) {
    return this.db.commissionClosing.create({ data });
  }

  async listClosings(professionalId?: string): Promise<CommissionClosingWithRelations[]> {
    return this.db.commissionClosing.findMany({
      where: { professionalId },
      include: closingInclude,
      orderBy: { closedAt: "desc" },
      take: 100,
    });
  }
}
