import type { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { UserStatus } from "@/modules/users/schemas/user.schema";

type PrismaOrTx = PrismaClient | Prisma.TransactionClient;

const userInclude = {
  roles: { include: { role: { select: { id: true, name: true, slug: true } } } },
} satisfies Prisma.UserInclude;

export type UserWithRoles = Prisma.UserGetPayload<{ include: typeof userInclude }>;

export class UserRepository {
  constructor(private readonly db: PrismaOrTx = prisma) {}

  async findById(id: string): Promise<UserWithRoles | null> {
    return this.db.user.findUnique({ where: { id }, include: userInclude });
  }

  async findByEmail(email: string): Promise<{ id: string } | null> {
    return this.db.user.findUnique({ where: { email }, select: { id: true } });
  }

  async list(filters: { search?: string; status?: UserStatus; roleId?: string }): Promise<UserWithRoles[]> {
    return this.db.user.findMany({
      where: {
        status: filters.status,
        roles: filters.roleId ? { some: { roleId: filters.roleId } } : undefined,
        ...(filters.search
          ? { OR: [{ name: { contains: filters.search } }, { email: { contains: filters.search } }] }
          : {}),
      },
      include: userInclude,
      orderBy: { name: "asc" },
    });
  }

  /** Cria o usuário e já vincula os papéis, em uma única transação. */
  async create(data: Prisma.UserCreateInput, roleIds: string[]): Promise<UserWithRoles> {
    return prisma.$transaction(async (tx) => {
      const user = await tx.user.create({ data });
      await tx.userRole.createMany({ data: roleIds.map((roleId) => ({ userId: user.id, roleId })) });
      return tx.user.findUniqueOrThrow({ where: { id: user.id }, include: userInclude });
    });
  }

  /** Atualiza o usuário e substitui a lista de papéis. */
  async update(id: string, data: Prisma.UserUpdateInput, roleIds: string[]): Promise<UserWithRoles> {
    return prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id }, data });
      await tx.userRole.deleteMany({ where: { userId: id } });
      await tx.userRole.createMany({ data: roleIds.map((roleId) => ({ userId: id, roleId })) });
      return tx.user.findUniqueOrThrow({ where: { id }, include: userInclude });
    });
  }

  async updatePasswordHash(id: string, passwordHash: string): Promise<void> {
    await this.db.user.update({ where: { id }, data: { passwordHash } });
  }

  async listAllRolesForSelect() {
    return this.db.role.findMany({ select: { id: true, name: true, slug: true }, orderBy: { name: "asc" } });
  }
}
