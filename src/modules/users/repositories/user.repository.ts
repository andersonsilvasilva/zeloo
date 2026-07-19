import type { Prisma } from "@prisma/client";
import { prisma, type PrismaOrTx } from "@/lib/prisma";
import type { UserStatus } from "@/modules/users/schemas/user.schema";
import { TenancyRepository } from "@/modules/tenancy/repositories/tenancy.repository";

function userInclude(tenantId: string) {
  return {
    roles: { where: { tenantId }, include: { role: { select: { id: true, name: true, slug: true } } } },
  } satisfies Prisma.UserInclude;
}

export type UserWithRoles = Prisma.UserGetPayload<{ include: ReturnType<typeof userInclude> }>;

/**
 * `User` é identidade global de propósito (uma pessoa pode ter conta em mais
 * de um tenant) — por isso não está em HARD_TENANT_MODELS e a extensão de
 * isolamento (tenant-extension.ts) não filtra essas queries sozinha. Todo
 * método aqui precisa escopar manualmente pela membership (`TenantUser`) do
 * tenant atual: sem isso, a tela de Usuários vazava a lista (e permitia
 * editar/excluir) gente de QUALQUER negócio a partir de qualquer tenant —
 * achado real em produção, corrigido junto com o `create()` não gerar o
 * vínculo `TenantUser` (por isso usuário novo não conseguia logar).
 */
export class UserRepository {
  constructor(private readonly db: PrismaOrTx = prisma) {}

  async findById(id: string, tenantId: string): Promise<UserWithRoles | null> {
    return this.db.user.findFirst({
      where: { id, tenantMemberships: { some: { tenantId } } },
      include: userInclude(tenantId),
    });
  }

  /** Global de propósito -- checa se o e-mail já existe em QUALQUER tenant, pra bloquear duplicata. */
  async findByEmail(email: string): Promise<{ id: string } | null> {
    return this.db.user.findUnique({ where: { email }, select: { id: true } });
  }

  async list(filters: { search?: string; status?: UserStatus; roleId?: string }, tenantId: string): Promise<UserWithRoles[]> {
    return this.db.user.findMany({
      where: {
        tenantMemberships: { some: { tenantId } },
        status: filters.status,
        roles: filters.roleId ? { some: { roleId: filters.roleId, tenantId } } : undefined,
        ...(filters.search
          ? { OR: [{ name: { contains: filters.search } }, { email: { contains: filters.search } }] }
          : {}),
      },
      include: userInclude(tenantId),
      orderBy: { name: "asc" },
    });
  }

  /** Cria o usuário, o vínculo (`TenantUser`) com o tenant atual e já vincula os papéis -- em uma única transação. */
  async create(data: Prisma.UserCreateInput, roleIds: string[], tenantId: string): Promise<UserWithRoles> {
    return prisma.$transaction(async (tx) => {
      const user = await tx.user.create({ data });
      await new TenancyRepository(tx).addMember(tenantId, user.id, "ACTIVE");
      await tx.userRole.createMany({ data: roleIds.map((roleId) => ({ userId: user.id, roleId })) });
      return tx.user.findUniqueOrThrow({ where: { id: user.id }, include: userInclude(tenantId) });
    });
  }

  /** Atualiza o usuário e substitui a lista de papéis dele NESTE tenant. */
  async update(id: string, data: Prisma.UserUpdateInput, roleIds: string[], tenantId: string): Promise<UserWithRoles> {
    return prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id }, data });
      await tx.userRole.deleteMany({ where: { userId: id, tenantId } });
      await tx.userRole.createMany({ data: roleIds.map((roleId) => ({ userId: id, roleId })) });
      return tx.user.findUniqueOrThrow({ where: { id }, include: userInclude(tenantId) });
    });
  }

  async updatePasswordHash(id: string, passwordHash: string): Promise<void> {
    await this.db.user.update({ where: { id }, data: { passwordHash } });
  }

  /**
   * Remove só o vínculo da pessoa com ESTE tenant (membership + papéis
   * aqui) -- nunca a conta `User` global, que pode ter login em outro
   * negócio. Se essa era a única membership da pessoa, a conta fica sem
   * nenhum tenant (mas continua existindo) -- não é papel desta tela decidir
   * se isso deveria apagar a conta de vez.
   */
  async delete(id: string, tenantId: string): Promise<void> {
    await prisma.$transaction(async (tx) => {
      await tx.userRole.deleteMany({ where: { userId: id, tenantId } });
      await new TenancyRepository(tx).removeMember(tenantId, id);
    });
  }

  async listAllRolesForSelect() {
    return this.db.role.findMany({ select: { id: true, name: true, slug: true }, orderBy: { name: "asc" } });
  }
}
