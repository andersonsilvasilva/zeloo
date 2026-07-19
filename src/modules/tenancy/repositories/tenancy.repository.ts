import type { Prisma } from "@prisma/client";
import { prisma, type PrismaOrTx } from "@/lib/prisma";

export class TenancyRepository {
  constructor(private readonly db: PrismaOrTx = prisma) {}

  async findTenantBySlug(slug: string) {
    return this.db.tenant.findUnique({ where: { slug } });
  }

  async findTenantById(id: string) {
    return this.db.tenant.findUnique({ where: { id } });
  }

  /** Todos os tenants + o membro mais antigo (proprietário, na prática) de cada um — tela de plataforma. */
  async listAllWithOwner() {
    return this.db.tenant.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        members: {
          orderBy: { createdAt: "asc" },
          take: 1,
          include: { user: { select: { name: true, email: true } } },
        },
      },
    });
  }

  async slugExists(slug: string): Promise<boolean> {
    const count = await this.db.tenant.count({ where: { slug } });
    return count > 0;
  }

  async createTenant(data: Prisma.TenantCreateInput) {
    return this.db.tenant.create({ data });
  }

  async addMember(tenantId: string, userId: string, status: "ACTIVE" | "INVITED" | "SUSPENDED" = "ACTIVE") {
    return this.db.tenantUser.upsert({
      where: { tenantId_userId: { tenantId, userId } },
      update: { status },
      create: { tenantId, userId, status },
    });
  }

  async listMemberships(userId: string) {
    return this.db.tenantUser.findMany({
      where: { userId, status: "ACTIVE" },
      include: { tenant: true },
    });
  }

  /** Existe vínculo com esse tenant, de qualquer status (não só ACTIVE, diferente de findActiveMembership). */
  async findMembership(tenantId: string, userId: string) {
    return this.db.tenantUser.findFirst({ where: { tenantId, userId } });
  }

  /** Remove só o vínculo com ESTE tenant -- nunca a conta `User` global, que pode ter membership em outro negócio. */
  async removeMember(tenantId: string, userId: string) {
    return this.db.tenantUser.deleteMany({ where: { tenantId, userId } });
  }

  /** Login por tenant (Fase 5, spec §29 passo 3) — associação ativa entre usuário e tenant. */
  async findActiveMembership(tenantId: string, userId: string) {
    return this.db.tenantUser.findFirst({
      where: { tenantId, userId, status: "ACTIVE" },
    });
  }

  /** Assinatura ativa (ou em trial) mais recente do tenant, com o plano e seus recursos. */
  async findActiveSubscription(tenantId: string) {
    return this.db.subscription.findFirst({
      where: { tenantId, status: { in: ["ACTIVE", "TRIALING"] } },
      include: { plan: { include: { features: true } } },
      orderBy: { createdAt: "desc" },
    });
  }

  async findTenantLimit(tenantId: string, key: string) {
    return this.db.tenantLimit.findUnique({ where: { tenantId_key: { tenantId, key } } });
  }

  async getUsage(tenantId: string, key: string, period: string) {
    return this.db.usageRecord.findUnique({ where: { tenantId_key_period: { tenantId, key, period } } });
  }

  async incrementUsage(tenantId: string, key: string, period: string, amount = 1) {
    return this.db.usageRecord.upsert({
      where: { tenantId_key_period: { tenantId, key, period } },
      update: { value: { increment: amount } },
      create: { tenantId, key, period, value: amount },
    });
  }
}
