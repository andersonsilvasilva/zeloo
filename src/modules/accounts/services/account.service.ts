import { addMonths } from "date-fns";
import { prisma } from "@/lib/prisma";
import {
  AccountRepository,
  type AccountEntryWithRelations,
  type RecurringAccountEntryWithRelations,
} from "@/modules/accounts/repositories/account.repository";
import { FinanceRepository } from "@/modules/finance/repositories/finance.repository";
import { NoOpenCashRegisterError } from "@/modules/finance/services/finance.service";
import type {
  AccountDirection,
  CreateAccountEntryInput,
  CreateRecurringAccountEntryInput,
  ListAccountEntriesInput,
  SettleAccountEntryInput,
} from "@/modules/accounts/schemas/account.schema";
import type {
  AccountClientOption,
  AccountEntryItem,
  AccountEntrySummary,
  MonthlyClosingReport,
  MonthlyClosingRow,
  RecurringAccountEntryItem,
} from "@/modules/accounts/types/account.types";

export { NoOpenCashRegisterError };

export class AccountEntryNotFoundError extends Error {
  constructor() {
    super("Conta não encontrada.");
    this.name = "AccountEntryNotFoundError";
  }
}

export class AccountEntryNotPendingError extends Error {
  constructor() {
    super("Esta conta já foi liquidada ou cancelada.");
    this.name = "AccountEntryNotPendingError";
  }
}

export class AccountEntrySettledCannotDeleteError extends Error {
  constructor() {
    super("Não é possível excluir uma conta já liquidada — mantém o histórico.");
    this.name = "AccountEntrySettledCannotDeleteError";
  }
}

export class AccountService {
  async list(filters: ListAccountEntriesInput): Promise<AccountEntryItem[]> {
    await this.ensureRecurringGenerated();
    const repo = new AccountRepository();
    const entries = await repo.listEntries(filters);
    return entries.map((e) => this.toItem(e));
  }

  async summarize(direction: AccountDirection): Promise<AccountEntrySummary> {
    const repo = new AccountRepository();
    const totals = await repo.summarize(direction);
    return { direction, ...totals };
  }

  async create(input: CreateAccountEntryInput, userId: string): Promise<AccountEntryItem> {
    const repo = new AccountRepository();
    const entry = await repo.createEntry({
      direction: input.direction,
      description: input.description,
      amount: input.amount,
      category: input.category || null,
      counterpartyName: input.counterpartyName || null,
      client: input.clientId ? { connect: { id: input.clientId } } : undefined,
      dueDate: input.dueDate,
      notes: input.notes || null,
      createdBy: { connect: { id: userId } },
    });
    return this.toItem(entry);
  }

  /** Liquida (paga/recebe) a conta — exige caixa aberto, gera o CashbookEntry correspondente. */
  async settle(input: SettleAccountEntryInput, userId: string): Promise<AccountEntryItem> {
    return prisma.$transaction(
      async (tx) => {
        const repo = new AccountRepository(tx);
        const financeRepo = new FinanceRepository(tx);

        const register = await financeRepo.findOpenRegister();
        if (!register) throw new NoOpenCashRegisterError();

        const entry = await repo.findEntryById(input.id);
        if (!entry) throw new AccountEntryNotFoundError();
        if (entry.status !== "PENDING") throw new AccountEntryNotPendingError();

        const now = new Date();
        const label = entry.direction === "RECEIVABLE" ? "Recebimento" : "Pagamento";

        const cashbookEntry = await financeRepo.createCashbookEntry({
          type: entry.direction === "RECEIVABLE" ? "CREDIT" : "DEBIT",
          description: `${label} — ${entry.description}`,
          amount: entry.amount,
          category: entry.category,
          paymentMethod: input.paymentMethod,
          transactionDate: now,
          createdBy: { connect: { id: userId } },
        });

        await repo.settleEntry(entry.id, {
          status: "SETTLED",
          settledAt: now,
          paymentMethod: input.paymentMethod,
          cashbookEntry: { connect: { id: cashbookEntry.id } },
        });

        const updated = await repo.findEntryById(entry.id);
        return this.toItem(updated!);
      },
      { timeout: 15000 },
    );
  }

  async cancel(id: string): Promise<void> {
    const repo = new AccountRepository();
    const entry = await repo.findEntryById(id);
    if (!entry) throw new AccountEntryNotFoundError();
    if (entry.status !== "PENDING") throw new AccountEntryNotPendingError();
    await repo.updateEntryStatus(id, "CANCELLED");
  }

  async delete(id: string): Promise<void> {
    const repo = new AccountRepository();
    const entry = await repo.findEntryById(id);
    if (!entry) throw new AccountEntryNotFoundError();
    if (entry.status === "SETTLED") throw new AccountEntrySettledCannotDeleteError();
    await repo.deleteEntry(id);
  }

  async listClientOptions(): Promise<AccountClientOption[]> {
    const repo = new AccountRepository();
    return repo.listActiveClientsForSelect();
  }

  // -- Recorrência ----------------------------------------------------------

  async listRecurring(direction: AccountDirection): Promise<RecurringAccountEntryItem[]> {
    const repo = new AccountRepository();
    const items = await repo.listRecurring(direction);
    return items.map((r) => this.toRecurringItem(r));
  }

  async createRecurring(input: CreateRecurringAccountEntryInput, userId: string): Promise<RecurringAccountEntryItem> {
    const repo = new AccountRepository();
    const created = await repo.createRecurring({
      direction: input.direction,
      description: input.description,
      amount: input.amount,
      category: input.category || null,
      counterpartyName: input.counterpartyName || null,
      client: input.clientId ? { connect: { id: input.clientId } } : undefined,
      dayOfMonth: input.dayOfMonth,
      createdBy: { connect: { id: userId } },
    });
    await this.ensureRecurringGenerated();
    return this.toRecurringItem(created);
  }

  async toggleRecurring(id: string, active: boolean): Promise<void> {
    const repo = new AccountRepository();
    await repo.setRecurringActive(id, active);
  }

  /**
   * Garante que toda conta recorrente ativa já tem uma ocorrência gerada pro
   * mês atual e pro próximo — chamado no início de toda listagem. Lazy, sem
   * cron/job runner (a VPS atual não tem infra pra isso). Idempotente: upsert
   * + `@@unique([recurringEntryId, dueDate])` no banco garante que nunca duplica,
   * mesmo com duas requisições concorrentes gerando o mesmo mês.
   */
  private async ensureRecurringGenerated(): Promise<void> {
    const repo = new AccountRepository();
    const templates = await repo.listActiveRecurring();
    if (templates.length === 0) return;

    const now = new Date();
    const monthsToEnsure = [now, addMonths(now, 1)];

    await Promise.all(
      templates.flatMap((template) =>
        monthsToEnsure.map((monthRef) => {
          // Date.UTC (não `new Date(y,m,d)` local) — dueDate é @db.Date, o Prisma
          // normaliza pra meia-noite UTC; construir em horário local desloca o dia
          // em fusos != UTC (ex.: dia 5 vira dia 4 em UTC-3).
          const dueDate = new Date(Date.UTC(monthRef.getFullYear(), monthRef.getMonth(), template.dayOfMonth));
          return repo.createEntryForRecurring(template.id, dueDate, {
            direction: template.direction,
            description: template.description,
            amount: template.amount,
            category: template.category,
            counterpartyName: template.counterpartyName,
            client: template.clientId ? { connect: { id: template.clientId } } : undefined,
            dueDate,
            recurringEntry: { connect: { id: template.id } },
          });
        }),
      ),
    );
  }

  /** Consolida contas a pagar/receber do mês por categoria — só leitura, não trava nada. */
  async getMonthlyClosingReport(month: Date): Promise<MonthlyClosingReport> {
    const repo = new AccountRepository();
    // Limites em UTC (não startOfMonth/endOfMonth locais) — dueDate/settledAt
    // são comparados contra um @db.Date normalizado pro Prisma em UTC.
    const year = month.getUTCFullYear();
    const monthIndex = month.getUTCMonth();
    const monthStart = new Date(Date.UTC(year, monthIndex, 1));
    const monthEnd = new Date(Date.UTC(year, monthIndex + 1, 0, 23, 59, 59, 999));

    const [grouped, settledGrouped] = await Promise.all([
      repo.sumByDirectionAndCategoryInRange(monthStart, monthEnd),
      repo.sumSettledByDirectionInRange(monthStart, monthEnd),
    ]);

    const rowMap = new Map<string, MonthlyClosingRow>();
    for (const g of grouped) {
      const category = g.category || "Sem categoria";
      const row = rowMap.get(category) ?? { category, payable: 0, receivable: 0 };
      const amount = g._sum.amount?.toNumber() ?? 0;
      if (g.direction === "PAYABLE") row.payable += amount;
      else row.receivable += amount;
      rowMap.set(category, row);
    }

    const rows = [...rowMap.values()].sort((a, b) => b.payable + b.receivable - (a.payable + a.receivable));
    const totalPayable = rows.reduce((sum, r) => sum + r.payable, 0);
    const totalReceivable = rows.reduce((sum, r) => sum + r.receivable, 0);

    const settledMap = new Map(settledGrouped.map((g) => [g.direction, g._sum.amount?.toNumber() ?? 0]));

    return {
      month: monthStart,
      rows,
      totalPayable,
      totalReceivable,
      totalPayableSettled: settledMap.get("PAYABLE") ?? 0,
      totalReceivableSettled: settledMap.get("RECEIVABLE") ?? 0,
      balance: (settledMap.get("RECEIVABLE") ?? 0) - (settledMap.get("PAYABLE") ?? 0),
    };
  }

  private toItem(entry: AccountEntryWithRelations): AccountEntryItem {
    return {
      id: entry.id,
      direction: entry.direction,
      description: entry.description,
      amount: entry.amount.toNumber(),
      category: entry.category,
      counterpartyName: entry.counterpartyName,
      client: entry.client,
      dueDate: entry.dueDate,
      status: entry.status,
      overdue: entry.status === "PENDING" && entry.dueDate < new Date(),
      settledAt: entry.settledAt,
      paymentMethod: entry.paymentMethod,
      recurringEntryId: entry.recurringEntryId,
      createdBy: entry.createdBy,
      notes: entry.notes,
    };
  }

  private toRecurringItem(entry: RecurringAccountEntryWithRelations): RecurringAccountEntryItem {
    return {
      id: entry.id,
      direction: entry.direction,
      description: entry.description,
      amount: entry.amount.toNumber(),
      category: entry.category,
      counterpartyName: entry.counterpartyName,
      client: entry.client,
      dayOfMonth: entry.dayOfMonth,
      active: entry.active,
    };
  }
}
