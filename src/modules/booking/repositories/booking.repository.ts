import type { Prisma } from "@prisma/client";
import { prisma, type PrismaOrTx } from "@/lib/prisma";
import { ROLES } from "@/lib/auth/permissions";

const clientSelect = {
  id: true,
  name: true,
  phone: true,
  whatsapp: true,
  userId: true,
} satisfies Prisma.ClientSelect;

export type PublicClient = Prisma.ClientGetPayload<{ select: typeof clientSelect }>;

export class BookingRepository {
  constructor(private readonly db: PrismaOrTx = prisma) {}

  async findClientByPhone(phone: string): Promise<PublicClient | null> {
    return this.db.client.findFirst({
      where: { OR: [{ phone }, { whatsapp: phone }] },
      select: clientSelect,
    });
  }

  async findClientById(id: string): Promise<PublicClient | null> {
    return this.db.client.findUnique({ where: { id }, select: clientSelect });
  }

  async findClientByUserId(userId: string): Promise<PublicClient | null> {
    return this.db.client.findUnique({ where: { userId }, select: clientSelect });
  }

  /** Cliente "leve", identificado só por nome+telefone — sem User/login vinculado. */
  async createClientByPhone(name: string, phone: string): Promise<PublicClient> {
    return this.db.client.create({
      data: { name, phone, whatsapp: phone, status: "ACTIVE" },
      select: clientSelect,
    });
  }

  /** Cadastro completo: User (com senha) + papel CLIENT + Client vinculado, em uma única transação. */
  async registerClientWithAccount(data: {
    name: string;
    email: string;
    phone: string;
    passwordHash: string;
  }): Promise<{ userId: string; clientId: string }> {
    return prisma.$transaction(async (tx) => {
      const clientRole = await tx.role.findUniqueOrThrow({ where: { slug: ROLES.CLIENT } });

      const user = await tx.user.create({
        data: {
          name: data.name,
          email: data.email,
          passwordHash: data.passwordHash,
          phone: data.phone,
          status: "ACTIVE",
        },
      });

      await tx.userRole.create({ data: { userId: user.id, roleId: clientRole.id } });

      const client = await tx.client.create({
        data: {
          userId: user.id,
          name: data.name,
          phone: data.phone,
          whatsapp: data.phone,
          email: data.email,
          status: "ACTIVE",
        },
      });

      return { userId: user.id, clientId: client.id };
    });
  }

  async findUserByEmail(email: string) {
    return this.db.user.findUnique({ where: { email }, select: { id: true } });
  }
}
