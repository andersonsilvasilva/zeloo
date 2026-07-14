import { endOfDay, startOfDay } from "date-fns";
import type { PixCharge } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { SettingsService } from "@/modules/settings/services/settings.service";
import { createPixPayment, getPaymentStatus, MercadoPagoNotConfiguredError } from "@/lib/mercadopago/mercadopago-client";
import {
  FinanceRepository,
  type CashRegisterWithRelations,
  type CashbookEntryWithRelations,
  type PayableAppointment,
} from "@/modules/finance/repositories/finance.repository";
import type {
  OpenCashRegisterInput,
  CloseCashRegisterInput,
  CreateCashbookEntryInput,
  RegisterPaymentInput,
  CreatePixChargeInput,
  ListCashbookEntriesInput,
  BalanceteFiltersInput,
} from "@/modules/finance/schemas/finance.schema";
import type {
  CashRegisterClosingSummary,
  CashRegisterInfo,
  CashbookEntryItem,
  PayableAppointmentOption,
  BalanceteRow,
  BalanceteSummary,
  PixChargeInfo,
  PaymentReceipt,
} from "@/modules/finance/types/finance.types";

export { MercadoPagoNotConfiguredError };

export class CashRegisterAlreadyOpenError extends Error {
  constructor() {
    super("Já existe um caixa aberto.");
    this.name = "CashRegisterAlreadyOpenError";
  }
}

export class NoOpenCashRegisterError extends Error {
  constructor() {
    super("Abra o caixa antes de registrar lançamentos ou pagamentos.");
    this.name = "NoOpenCashRegisterError";
  }
}

export class AppointmentNotFoundError extends Error {
  constructor() {
    super("Agendamento não encontrado.");
    this.name = "AppointmentNotFoundError";
  }
}

export class AppointmentNotPayableError extends Error {
  constructor() {
    super("Este agendamento não está concluído ou já possui pagamento registrado.");
    this.name = "AppointmentNotPayableError";
  }
}

export class PaymentNotFoundError extends Error {
  constructor() {
    super("Pagamento não encontrado.");
    this.name = "PaymentNotFoundError";
  }
}

export class PixChargeNotFoundError extends Error {
  constructor() {
    super("Cobrança Pix não encontrada.");
    this.name = "PixChargeNotFoundError";
  }
}

export class FinanceService {
  async getCurrentRegister(): Promise<CashRegisterInfo | null> {
    const repo = new FinanceRepository();
    const register = await repo.findOpenRegister();
    return register ? this.toRegisterInfo(register) : null;
  }

  async openRegister(input: OpenCashRegisterInput, userId: string): Promise<CashRegisterInfo> {
    const repo = new FinanceRepository();
    const existing = await repo.findOpenRegister();
    if (existing) throw new CashRegisterAlreadyOpenError();

    const register = await repo.createRegister({
      openedBy: { connect: { id: userId } },
      openedAt: new Date(),
      openingBalance: input.openingBalance,
      status: "OPEN",
    });
    return this.toRegisterInfo(register);
  }

  async closeRegister(input: CloseCashRegisterInput, userId: string): Promise<CashRegisterClosingSummary> {
    return prisma.$transaction(async (tx) => {
      const repo = new FinanceRepository(tx);
      const register = await repo.findOpenRegister();
      if (!register) throw new NoOpenCashRegisterError();

      const [creditSum, debitSum] = await Promise.all([
        repo.sumEntriesSince(register.openedAt, "CREDIT"),
        repo.sumEntriesSince(register.openedAt, "DEBIT"),
      ]);

      const expectedBalance = register.openingBalance.toNumber() + creditSum - debitSum;
      const difference = input.actualBalance - expectedBalance;

      await repo.createClosing({
        cashRegister: { connect: { id: register.id } },
        closedBy: { connect: { id: userId } },
        closedAt: new Date(),
        expectedBalance,
        actualBalance: input.actualBalance,
        difference,
        notes: input.notes || null,
      });
      await repo.closeRegister(register.id);

      return { expectedBalance, actualBalance: input.actualBalance, difference };
    });
  }

  async listCashbookEntries(filters: ListCashbookEntriesInput): Promise<CashbookEntryItem[]> {
    const repo = new FinanceRepository();
    const entries = await repo.listCashbookEntries(filters);
    return entries.map((e) => this.toCashbookItem(e));
  }

  async createCashbookEntry(input: CreateCashbookEntryInput, userId: string): Promise<CashbookEntryItem> {
    const repo = new FinanceRepository();
    const register = await repo.findOpenRegister();
    if (!register) throw new NoOpenCashRegisterError();

    const entry = await repo.createCashbookEntry({
      type: input.type,
      description: input.description,
      amount: input.amount,
      category: input.category || null,
      paymentMethod: input.paymentMethod,
      transactionDate: input.transactionDate,
      notes: input.notes || null,
      createdBy: { connect: { id: userId } },
    });
    return this.toCashbookItem(entry);
  }

  async listPayableAppointments(): Promise<PayableAppointmentOption[]> {
    const repo = new FinanceRepository();
    const appointments = await repo.findPayableAppointments();
    return appointments.map((a) => this.toPayableOption(a));
  }

  async registerPayment(input: RegisterPaymentInput, userId: string) {
    return prisma.$transaction(
      async (tx) => {
        const repo = new FinanceRepository(tx);

        const register = await repo.findOpenRegister();
        if (!register) throw new NoOpenCashRegisterError();

        const appointment = await repo.findAppointmentById(input.appointmentId);
        if (!appointment) throw new AppointmentNotFoundError();

        const existingPayments = await repo.countPaymentsForAppointment(input.appointmentId);
        if (appointment.status !== "COMPLETED" || existingPayments > 0) {
          throw new AppointmentNotPayableError();
        }

        const now = new Date();
        const payment = await repo.createPayment({
          appointment: { connect: { id: input.appointmentId } },
          amount: input.amount,
          paymentMethod: input.paymentMethod,
          status: "PAID",
          paidAt: now,
          receivedBy: { connect: { id: userId } },
        });

        const entry = await repo.createCashbookEntry({
          type: "CREDIT",
          description: `Pagamento — ${appointment.client.name}`,
          amount: input.amount,
          paymentMethod: input.paymentMethod,
          appointmentId: input.appointmentId,
          payment: { connect: { id: payment.id } },
          transactionDate: now,
          createdBy: { connect: { id: userId } },
        });

        return { entry: this.toCashbookItem(entry), paymentId: payment.id };
      },
      // 5 consultas sequenciais numa transação: o limite padrão de 5s do Prisma
      // é apertado demais sob rede mais lenta até o banco (ex.: hospedagem
      // compartilhada) — visto travar com "Transaction already closed" em teste.
      { timeout: 15000 },
    );
  }

  /**
   * Gera uma cobrança Pix via Mercado Pago pra um agendamento pagável. Não
   * cria Payment/CashbookEntry ainda — isso só acontece quando o webhook
   * confirma o pagamento (ver `confirmPixCharge`). Se já existir uma cobrança
   * PENDING pro mesmo agendamento, devolve ela em vez de gerar uma nova (evita
   * QR codes duplicados se o usuário reabrir o diálogo).
   */
  async createPixCharge(input: CreatePixChargeInput, userId: string): Promise<PixChargeInfo> {
    const repo = new FinanceRepository();

    const register = await repo.findOpenRegister();
    if (!register) throw new NoOpenCashRegisterError();

    const appointment = await repo.findAppointmentById(input.appointmentId);
    if (!appointment) throw new AppointmentNotFoundError();

    const existingPayments = await repo.countPaymentsForAppointment(input.appointmentId);
    if (appointment.status !== "COMPLETED" || existingPayments > 0) {
      throw new AppointmentNotPayableError();
    }

    const pending = await repo.findPendingPixChargeByAppointmentId(input.appointmentId);
    if (pending) return this.toPixChargeInfo(pending);

    const settingsService = new SettingsService();
    const { accessToken } = await settingsService.getMercadoPagoCredentials();
    if (!accessToken) throw new MercadoPagoNotConfiguredError();

    const result = await createPixPayment({
      accessToken,
      amount: input.amount,
      description: `Pagamento — ${appointment.client.name}`,
      appointmentId: input.appointmentId,
      payerEmail: appointment.client.email || "cliente@sememail.com",
    });

    const charge = await repo.createPixCharge({
      appointment: { connect: { id: input.appointmentId } },
      mercadoPagoPaymentId: result.mercadoPagoPaymentId,
      qrCode: result.qrCode,
      qrCodeBase64: result.qrCodeBase64,
      amount: input.amount,
      status: "PENDING",
      createdBy: { connect: { id: userId } },
    });

    return this.toPixChargeInfo(charge);
  }

  /** Leitura pra polling da tela — reflete o que o webhook já confirmou, não consulta o Mercado Pago ao vivo. */
  async getPixChargeStatus(id: string): Promise<PixChargeInfo> {
    const repo = new FinanceRepository();
    const charge = await repo.findPixChargeById(id);
    if (!charge) throw new PixChargeNotFoundError();
    return this.toPixChargeInfo(charge);
  }

  /**
   * Chamado pelo webhook do Mercado Pago (sem sessão de usuário — userId fica
   * null no log de auditoria). Nunca confia no corpo do webhook por si só:
   * sempre reconsulta o status direto na API do Mercado Pago antes de dar
   * baixa, e reconfirma dentro da transação que a cobrança ainda não foi
   * processada — cobre reenvios do mesmo webhook (Mercado Pago reenvia em
   * qualquer resposta não-2xx, e pode reenviar mesmo com 2xx por segurança).
   */
  async confirmPixCharge(mercadoPagoPaymentId: string): Promise<void> {
    const repo = new FinanceRepository();
    const charge = await repo.findPixChargeByMercadoPagoPaymentId(mercadoPagoPaymentId);
    if (!charge) return;
    if (charge.status === "APPROVED" && charge.paymentId) return;

    const settingsService = new SettingsService();
    const { accessToken } = await settingsService.getMercadoPagoCredentials();
    if (!accessToken) return;

    const status = await getPaymentStatus(accessToken, mercadoPagoPaymentId);

    if (status === "approved") {
      await prisma.$transaction(
        async (tx) => {
          const txRepo = new FinanceRepository(tx);
          const current = await txRepo.findPixChargeById(charge.id);
          if (!current || (current.status === "APPROVED" && current.paymentId)) return;

          const payment = await txRepo.createPayment({
            appointment: { connect: { id: charge.appointmentId } },
            amount: charge.amount,
            paymentMethod: "PIX",
            status: "PAID",
            paidAt: new Date(),
          });

          await txRepo.createCashbookEntry({
            type: "CREDIT",
            description: `Pagamento Pix — cobrança ${charge.id}`,
            amount: charge.amount,
            paymentMethod: "PIX",
            appointmentId: charge.appointmentId,
            payment: { connect: { id: payment.id } },
            transactionDate: new Date(),
          });

          await txRepo.updatePixCharge(charge.id, {
            status: "APPROVED",
            payment: { connect: { id: payment.id } },
          });
        },
        { timeout: 15000 },
      );
    } else if (status === "rejected") {
      await repo.updatePixCharge(charge.id, { status: "REJECTED" });
    } else if (status === "cancelled") {
      await repo.updatePixCharge(charge.id, { status: "CANCELLED" });
    }
    // "pending"/"in_process" -> continua PENDING, sem alteração.
  }

  async getPaymentReceipt(paymentId: string): Promise<PaymentReceipt> {
    const repo = new FinanceRepository();
    const payment = await repo.findPaymentById(paymentId);
    if (!payment) throw new PaymentNotFoundError();

    return {
      id: payment.id,
      amount: payment.amount.toNumber(),
      paymentMethod: payment.paymentMethod,
      paidAt: payment.paidAt,
      receivedByName: payment.receivedBy?.name ?? null,
      clientName: payment.appointment.client.name,
      clientPhone: payment.appointment.client.whatsapp || payment.appointment.client.phone,
      professionalName: payment.appointment.professional.professionalName,
      servicesLabel: payment.appointment.services.map((s) => s.service.name).join(", "),
      appointmentDate: payment.appointment.appointmentDate,
      startTime: payment.appointment.startTime,
    };
  }

  /** Balancete débito/crédito: agrupa lançamentos por categoria no período, com totais gerais. */
  async getBalancete(filters: BalanceteFiltersInput): Promise<BalanceteSummary> {
    const repo = new FinanceRepository();
    const grouped = await repo.sumEntriesByCategoryInRange(startOfDay(filters.dateFrom), endOfDay(filters.dateTo));

    const rowMap = new Map<string, BalanceteRow>();
    for (const g of grouped) {
      const category = g.category || "Sem categoria";
      const row = rowMap.get(category) ?? { category, credit: 0, debit: 0, balance: 0 };
      const amount = g._sum.amount?.toNumber() ?? 0;
      if (g.type === "CREDIT") row.credit += amount;
      else row.debit += amount;
      row.balance = row.credit - row.debit;
      rowMap.set(category, row);
    }

    const rows = [...rowMap.values()].sort((a, b) => b.credit + b.debit - (a.credit + a.debit));
    const totalCredit = rows.reduce((sum, r) => sum + r.credit, 0);
    const totalDebit = rows.reduce((sum, r) => sum + r.debit, 0);

    return {
      dateFrom: filters.dateFrom,
      dateTo: filters.dateTo,
      rows,
      totalCredit,
      totalDebit,
      totalBalance: totalCredit - totalDebit,
    };
  }

  private toRegisterInfo(register: CashRegisterWithRelations): CashRegisterInfo {
    return {
      id: register.id,
      openedAt: register.openedAt,
      openingBalance: register.openingBalance.toNumber(),
      openedBy: register.openedBy,
    };
  }

  private toCashbookItem(entry: CashbookEntryWithRelations): CashbookEntryItem {
    return {
      id: entry.id,
      type: entry.type,
      description: entry.description,
      amount: entry.amount.toNumber(),
      category: entry.category,
      paymentMethod: entry.paymentMethod,
      transactionDate: entry.transactionDate,
      createdBy: entry.createdBy,
      notes: entry.notes,
    };
  }

  private toPayableOption(appointment: PayableAppointment): PayableAppointmentOption {
    return {
      id: appointment.id,
      clientName: appointment.client.name,
      professionalName: appointment.professional.professionalName,
      servicesLabel: appointment.services.map((s) => s.service.name).join(", "),
      totalPrice: appointment.services.reduce((sum, s) => sum + s.price.toNumber(), 0),
      appointmentDate: appointment.appointmentDate,
      startTime: appointment.startTime,
    };
  }

  private toPixChargeInfo(charge: PixCharge): PixChargeInfo {
    return {
      id: charge.id,
      appointmentId: charge.appointmentId,
      status: charge.status,
      qrCode: charge.qrCode,
      qrCodeBase64: charge.qrCodeBase64,
      amount: charge.amount.toNumber(),
      expiresAt: charge.expiresAt,
      paymentId: charge.paymentId,
    };
  }
}
