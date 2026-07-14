import type { Prisma } from "@prisma/client";
import { prisma, type PrismaOrTx } from "@/lib/prisma";
import type { CashbookEntryType } from "@/modules/finance/schemas/finance.schema";

const registerInclude = {
  openedBy: { select: { id: true, name: true } },
} satisfies Prisma.CashRegisterInclude;

export type CashRegisterWithRelations = Prisma.CashRegisterGetPayload<{ include: typeof registerInclude }>;

const cashbookInclude = {
  createdBy: { select: { id: true, name: true } },
} satisfies Prisma.CashbookEntryInclude;

export type CashbookEntryWithRelations = Prisma.CashbookEntryGetPayload<{ include: typeof cashbookInclude }>;

const payableAppointmentInclude = {
  client: { select: { name: true, email: true } },
  professional: { select: { professionalName: true } },
  services: { include: { service: { select: { name: true } } } },
} satisfies Prisma.AppointmentInclude;

export type PayableAppointment = Prisma.AppointmentGetPayload<{ include: typeof payableAppointmentInclude }>;

const paymentReceiptInclude = {
  receivedBy: { select: { id: true, name: true } },
  appointment: {
    include: {
      client: { select: { name: true, phone: true, whatsapp: true } },
      professional: { select: { professionalName: true } },
      services: { include: { service: { select: { name: true } } } },
    },
  },
} satisfies Prisma.PaymentInclude;

export type PaymentWithReceiptRelations = Prisma.PaymentGetPayload<{ include: typeof paymentReceiptInclude }>;

export class FinanceRepository {
  constructor(private readonly db: PrismaOrTx = prisma) {}

  async findOpenRegister(): Promise<CashRegisterWithRelations | null> {
    return this.db.cashRegister.findFirst({ where: { status: "OPEN" }, include: registerInclude });
  }

  async createRegister(data: Prisma.CashRegisterCreateInput): Promise<CashRegisterWithRelations> {
    return this.db.cashRegister.create({ data, include: registerInclude });
  }

  async closeRegister(id: string): Promise<void> {
    await this.db.cashRegister.update({ where: { id }, data: { status: "CLOSED" } });
  }

  async createClosing(data: Prisma.CashRegisterClosingCreateInput): Promise<void> {
    await this.db.cashRegisterClosing.create({ data });
  }

  /** Soma das entradas do livro-caixa criadas desde a abertura do caixa atual, por tipo. */
  async sumEntriesSince(sinceDate: Date, type: CashbookEntryType): Promise<number> {
    const result = await this.db.cashbookEntry.aggregate({
      _sum: { amount: true },
      where: { type, createdAt: { gte: sinceDate } },
    });
    return result._sum.amount?.toNumber() ?? 0;
  }

  async listCashbookEntries(filters: {
    dateFrom?: Date;
    dateTo?: Date;
    type?: CashbookEntryType;
  }): Promise<CashbookEntryWithRelations[]> {
    return this.db.cashbookEntry.findMany({
      where: {
        type: filters.type,
        transactionDate:
          filters.dateFrom || filters.dateTo ? { gte: filters.dateFrom, lte: filters.dateTo } : undefined,
      },
      include: cashbookInclude,
      orderBy: { transactionDate: "desc" },
      take: 200,
    });
  }

  async createCashbookEntry(data: Prisma.CashbookEntryCreateInput): Promise<CashbookEntryWithRelations> {
    return this.db.cashbookEntry.create({ data, include: cashbookInclude });
  }

  /** Soma por categoria e tipo (CREDIT/DEBIT) dentro de um intervalo de datas — base do balancete. */
  async sumEntriesByCategoryInRange(dateFrom: Date, dateTo: Date) {
    return this.db.cashbookEntry.groupBy({
      by: ["category", "type"],
      where: { transactionDate: { gte: dateFrom, lte: dateTo } },
      _sum: { amount: true },
    });
  }

  async findPayableAppointments(): Promise<PayableAppointment[]> {
    return this.db.appointment.findMany({
      where: { status: "COMPLETED", payments: { none: {} } },
      include: payableAppointmentInclude,
      orderBy: { startTime: "desc" },
      take: 50,
    });
  }

  async findAppointmentById(id: string): Promise<PayableAppointment | null> {
    return this.db.appointment.findUnique({ where: { id }, include: payableAppointmentInclude });
  }

  async countPaymentsForAppointment(appointmentId: string): Promise<number> {
    return this.db.payment.count({ where: { appointmentId } });
  }

  async createPayment(data: Prisma.PaymentCreateInput) {
    return this.db.payment.create({ data });
  }

  async findPendingPixChargeByAppointmentId(appointmentId: string) {
    return this.db.pixCharge.findFirst({ where: { appointmentId, status: "PENDING" } });
  }

  async createPixCharge(data: Prisma.PixChargeCreateInput) {
    return this.db.pixCharge.create({ data });
  }

  async findPixChargeById(id: string) {
    return this.db.pixCharge.findUnique({ where: { id } });
  }

  async findPixChargeByMercadoPagoPaymentId(mercadoPagoPaymentId: string) {
    return this.db.pixCharge.findUnique({ where: { mercadoPagoPaymentId } });
  }

  async updatePixCharge(id: string, data: Prisma.PixChargeUpdateInput) {
    return this.db.pixCharge.update({ where: { id }, data });
  }

  async findPaymentById(id: string): Promise<PaymentWithReceiptRelations | null> {
    return this.db.payment.findUnique({ where: { id }, include: paymentReceiptInclude });
  }
}
