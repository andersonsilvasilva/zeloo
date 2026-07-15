import { addDays } from "date-fns";
import { prisma } from "@/lib/prisma";
import type { DateRange } from "@/modules/reports/repositories/dashboard.repository";
import { findCompletedAppointmentsInRangeDetailed } from "@/modules/reports/repositories/period-report.repository";
import { CommissionRepository, type CommissionClosingWithRelations } from "@/modules/commissions/repositories/commission.repository";
import { FinanceRepository } from "@/modules/finance/repositories/finance.repository";
import { NoOpenCashRegisterError } from "@/modules/finance/services/finance.service";
import type { CloseCommissionInput } from "@/modules/commissions/schemas/commission.schema";
import type { CommissionClosingItem, CommissionPendingRow } from "@/modules/commissions/types/commission.types";

export { NoOpenCashRegisterError };

export class ProfessionalNotFoundError extends Error {
  constructor() {
    super("Profissional não encontrado.");
    this.name = "ProfessionalNotFoundError";
  }
}

export class CommissionAlreadyClosedError extends Error {
  constructor() {
    super("Já existe um fechamento de comissão pra este profissional neste período.");
    this.name = "CommissionAlreadyClosedError";
  }
}

export class CommissionService {
  /**
   * Comissão calculada automaticamente (receita paga no período × commissionPercentage),
   * reaproveitando a mesma consulta usada em `/relatorios` — não duplica a lógica de
   * apuração de receita por profissional. `onlyProfessionalId` restringe a lista a um só
   * profissional (usado quando quem pede é o próprio PROFESSIONAL, nunca vê os outros).
   */
  async listPending(periodStart: Date, periodEnd: Date, onlyProfessionalId?: string): Promise<CommissionPendingRow[]> {
    const repo = new CommissionRepository();
    const all = await repo.listActiveProfessionals();
    const professionals = onlyProfessionalId ? all.filter((p) => p.id === onlyProfessionalId) : all;

    // periodStart/periodEnd já chegam como meia-noite UTC (ver parseDateOnly na
    // page) — nunca normalizar com startOfDay local, que desloca o dia em
    // fusos != UTC. addDays é seguro aqui: soma relativa, não reconstrução.
    const range: DateRange = { start: periodStart, end: addDays(periodEnd, 1) };

    return Promise.all(
      professionals.map(async (professional) => {
        const appointments = await findCompletedAppointmentsInRangeDetailed(range, professional.id);
        const revenue = appointments.reduce(
          (sum, appt) => sum + appt.payments.reduce((s, p) => s + p.amount.toNumber(), 0),
          0,
        );
        const commissionPercentage = professional.commissionPercentage.toNumber();
        const calculatedAmount = revenue * (commissionPercentage / 100);
        const closing = await repo.findClosingForPeriod(professional.id, periodStart, periodEnd);

        return {
          professionalId: professional.id,
          professionalName: professional.professionalName,
          commissionPercentage,
          revenue,
          calculatedAmount,
          alreadyClosed: !!closing,
          closingId: closing?.id ?? null,
        };
      }),
    );
  }

  /**
   * Fecha a comissão de um profissional num período — recalcula o valor automático
   * de novo (nunca confia no que o cliente mandou), mas grava o `finalAmount`
   * ajustado manualmente. Exige caixa aberto (gera um CashbookEntry DEBIT junto).
   * Imutável depois de criado — `@@unique([professionalId, periodStart, periodEnd])`
   * no banco garante que não fecha o mesmo período duas vezes.
   */
  async closeCommission(input: CloseCommissionInput, userId: string): Promise<CommissionClosingItem> {
    const repo = new CommissionRepository();
    const professional = await repo.findProfessionalById(input.professionalId);
    if (!professional) throw new ProfessionalNotFoundError();

    // Já chegam como meia-noite UTC (ver parseDateOnly no schema/página) — não
    // normalizar com startOfDay local.
    const periodStart = input.periodStart;
    const periodEnd = input.periodEnd;

    const existing = await repo.findClosingForPeriod(input.professionalId, periodStart, periodEnd);
    if (existing) throw new CommissionAlreadyClosedError();

    const range: DateRange = { start: periodStart, end: addDays(periodEnd, 1) };
    const appointments = await findCompletedAppointmentsInRangeDetailed(range, input.professionalId);
    const revenue = appointments.reduce((sum, appt) => sum + appt.payments.reduce((s, p) => s + p.amount.toNumber(), 0), 0);
    const calculatedAmount = revenue * (professional.commissionPercentage.toNumber() / 100);

    return prisma.$transaction(
      async (tx) => {
        const txRepo = new CommissionRepository(tx);
        const financeRepo = new FinanceRepository(tx);

        const register = await financeRepo.findOpenRegister();
        if (!register) throw new NoOpenCashRegisterError();

        // Reconfere dentro da transação — cobre corrida entre o check acima e aqui.
        const stillFree = await txRepo.findClosingForPeriod(input.professionalId, periodStart, periodEnd);
        if (stillFree) throw new CommissionAlreadyClosedError();

        const cashbookEntry = await financeRepo.createCashbookEntry({
          type: "DEBIT",
          description: `Comissão — ${professional.professionalName}`,
          amount: input.finalAmount,
          category: "Comissões",
          paymentMethod: input.paymentMethod,
          transactionDate: new Date(),
          createdBy: { connect: { id: userId } },
        });

        const created = await txRepo.createClosing({
          professional: { connect: { id: input.professionalId } },
          periodStart,
          periodEnd,
          calculatedAmount,
          finalAmount: input.finalAmount,
          adjustmentNotes: input.adjustmentNotes || null,
          cashbookEntry: { connect: { id: cashbookEntry.id } },
          closedBy: { connect: { id: userId } },
          closedAt: new Date(),
        });

        return {
          id: created.id,
          professionalId: input.professionalId,
          professionalName: professional.professionalName,
          periodStart,
          periodEnd,
          calculatedAmount,
          finalAmount: input.finalAmount,
          adjustmentNotes: input.adjustmentNotes || null,
          closedAt: created.closedAt,
          closedByName: null,
        };
      },
      { timeout: 15000 },
    );
  }

  async listClosings(onlyProfessionalId?: string): Promise<CommissionClosingItem[]> {
    const repo = new CommissionRepository();
    const closings = await repo.listClosings(onlyProfessionalId);
    return closings.map((c) => this.toItem(c));
  }

  private toItem(closing: CommissionClosingWithRelations): CommissionClosingItem {
    return {
      id: closing.id,
      professionalId: closing.professionalId,
      professionalName: closing.professional.professionalName,
      periodStart: closing.periodStart,
      periodEnd: closing.periodEnd,
      calculatedAmount: closing.calculatedAmount.toNumber(),
      finalAmount: closing.finalAmount.toNumber(),
      adjustmentNotes: closing.adjustmentNotes,
      closedAt: closing.closedAt,
      closedByName: closing.closedBy?.name ?? null,
    };
  }
}
