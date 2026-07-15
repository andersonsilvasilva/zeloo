import type { Prisma } from "@prisma/client";
import { prisma, type PrismaOrTx } from "@/lib/prisma";
import type { AccountDirection, AccountEntryStatus } from "@/modules/accounts/schemas/account.schema";

const accountEntryInclude = {
  client: { select: { id: true, name: true } },
  createdBy: { select: { id: true, name: true } },
} satisfies Prisma.AccountEntryInclude;

export type AccountEntryWithRelations = Prisma.AccountEntryGetPayload<{ include: typeof accountEntryInclude }>;

const recurringEntryInclude = {
  client: { select: { id: true, name: true } },
} satisfies Prisma.RecurringAccountEntryInclude;

export type RecurringAccountEntryWithRelations = Prisma.RecurringAccountEntryGetPayload<{
  include: typeof recurringEntryInclude;
}>;

export class AccountRepository {
  constructor(private readonly db: PrismaOrTx = prisma) {}

  async listEntries(filters: {
    direction: AccountDirection;
    dateFrom?: Date;
    dateTo?: Date;
    status?: AccountEntryStatus;
  }): Promise<AccountEntryWithRelations[]> {
    return this.db.accountEntry.findMany({
      where: {
        direction: filters.direction,
        status: filters.status,
        dueDate: filters.dateFrom || filters.dateTo ? { gte: filters.dateFrom, lte: filters.dateTo } : undefined,
      },
      include: accountEntryInclude,
      orderBy: { dueDate: "asc" },
      take: 300,
    });
  }

  async findEntryById(id: string): Promise<AccountEntryWithRelations | null> {
    return this.db.accountEntry.findUnique({ where: { id }, include: accountEntryInclude });
  }

  async createEntry(data: Prisma.AccountEntryCreateInput): Promise<AccountEntryWithRelations> {
    return this.db.accountEntry.create({ data, include: accountEntryInclude });
  }

  async settleEntry(id: string, data: Prisma.AccountEntryUpdateInput): Promise<void> {
    await this.db.accountEntry.update({ where: { id }, data });
  }

  async updateEntryStatus(id: string, status: AccountEntryStatus): Promise<void> {
    await this.db.accountEntry.update({ where: { id }, data: { status } });
  }

  async deleteEntry(id: string): Promise<void> {
    await this.db.accountEntry.delete({ where: { id } });
  }

  /** Totais pendente/vencido/liquidado — base do "relatório embutido" de cada módulo. */
  async summarize(direction: AccountDirection): Promise<{ totalPending: number; totalOverdue: number; totalSettled: number }> {
    const now = new Date();
    const [pending, overdue, settled] = await Promise.all([
      this.db.accountEntry.aggregate({ _sum: { amount: true }, where: { direction, status: "PENDING" } }),
      this.db.accountEntry.aggregate({
        _sum: { amount: true },
        where: { direction, status: "PENDING", dueDate: { lt: now } },
      }),
      this.db.accountEntry.aggregate({ _sum: { amount: true }, where: { direction, status: "SETTLED" } }),
    ]);
    return {
      totalPending: pending._sum.amount?.toNumber() ?? 0,
      totalOverdue: overdue._sum.amount?.toNumber() ?? 0,
      totalSettled: settled._sum.amount?.toNumber() ?? 0,
    };
  }

  /** Contas com vencimento no mês (qualquer status), agrupadas por direção+categoria — base do fechamento mensal. */
  async sumByDirectionAndCategoryInRange(monthStart: Date, monthEnd: Date) {
    return this.db.accountEntry.groupBy({
      by: ["direction", "category"],
      where: { dueDate: { gte: monthStart, lte: monthEnd } },
      _sum: { amount: true },
    });
  }

  /** Já liquidadas no mês (por settledAt), por direção — usado no saldo do fechamento mensal. */
  async sumSettledByDirectionInRange(monthStart: Date, monthEnd: Date) {
    return this.db.accountEntry.groupBy({
      by: ["direction"],
      where: { status: "SETTLED", settledAt: { gte: monthStart, lte: monthEnd } },
      _sum: { amount: true },
    });
  }

  async listActiveClientsForSelect() {
    return this.db.client.findMany({
      where: { status: { in: ["ACTIVE", "VIP"] } },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });
  }

  // -- Recorrência --------------------------------------------------------

  async listRecurring(direction: AccountDirection): Promise<RecurringAccountEntryWithRelations[]> {
    return this.db.recurringAccountEntry.findMany({
      where: { direction },
      include: recurringEntryInclude,
      orderBy: { description: "asc" },
    });
  }

  async listActiveRecurring(): Promise<RecurringAccountEntryWithRelations[]> {
    return this.db.recurringAccountEntry.findMany({ where: { active: true }, include: recurringEntryInclude });
  }

  async createRecurring(data: Prisma.RecurringAccountEntryCreateInput): Promise<RecurringAccountEntryWithRelations> {
    return this.db.recurringAccountEntry.create({ data, include: recurringEntryInclude });
  }

  async setRecurringActive(id: string, active: boolean): Promise<void> {
    await this.db.recurringAccountEntry.update({ where: { id }, data: { active } });
  }

  async findEntryForRecurringMonth(recurringEntryId: string, dueDate: Date): Promise<{ id: string } | null> {
    return this.db.accountEntry.findUnique({
      where: { recurringEntryId_dueDate: { recurringEntryId, dueDate } },
      select: { id: true },
    });
  }

  /**
   * Cria a ocorrência do mês pra uma conta recorrente — ignora se já existir.
   * `upsert` sozinho não é suficiente: duas requisições concorrentes (comum no
   * fast refresh do Next em dev, ou só duas abas abertas ao mesmo tempo) podem
   * achar "não existe" ao mesmo tempo e as duas tentarem criar, uma delas
   * batendo na constraint única — nesse caso o registro já existe (foi a outra
   * requisição que criou), então é seguro só ignorar o erro.
   */
  async createEntryForRecurring(recurringEntryId: string, dueDate: Date, data: Prisma.AccountEntryCreateInput): Promise<void> {
    try {
      await this.db.accountEntry.upsert({
        where: { recurringEntryId_dueDate: { recurringEntryId, dueDate } },
        create: data,
        update: {},
      });
    } catch (error) {
      const isUniqueConstraintError =
        typeof error === "object" && error !== null && "code" in error && (error as { code?: string }).code === "P2002";
      if (!isUniqueConstraintError) throw error;
    }
  }
}
