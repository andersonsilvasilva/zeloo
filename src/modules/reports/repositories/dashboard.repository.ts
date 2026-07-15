import "server-only";
import { prisma } from "@/lib/prisma";

export interface DateRange {
  start: Date;
  end: Date;
}

export function countCompletedAppointments(range: DateRange) {
  return prisma.appointment.count({
    where: { status: "COMPLETED", appointmentDate: { gte: range.start, lt: range.end } },
  });
}

export async function sumPaidRevenue(range: DateRange): Promise<number> {
  const result = await prisma.payment.aggregate({
    _sum: { amount: true },
    where: { status: "PAID", paidAt: { gte: range.start, lt: range.end } },
  });
  return result._sum.amount?.toNumber() ?? 0;
}

export function findCompletedAppointmentsInRange(range: DateRange) {
  return prisma.appointment.findMany({
    where: { status: "COMPLETED", appointmentDate: { gte: range.start, lt: range.end } },
    select: {
      id: true,
      professionalId: true,
      professional: { select: { professionalName: true } },
      clientId: true,
      client: { select: { name: true } },
      services: { select: { serviceId: true, service: { select: { name: true } } } },
      payments: { where: { status: "PAID" }, select: { amount: true } },
    },
  });
}

export function findPaidPaymentsInRange(range: DateRange) {
  return prisma.payment.findMany({
    where: { status: "PAID", paidAt: { gte: range.start, lt: range.end } },
    select: { amount: true, paidAt: true },
  });
}

/** Contas a pagar/receber com vencimento no período (exclui canceladas) — base do gráfico de tendência do dashboard. */
export function findAccountEntriesForTrend(range: DateRange) {
  return prisma.accountEntry.findMany({
    where: { status: { not: "CANCELLED" }, dueDate: { gte: range.start, lt: range.end } },
    select: { direction: true, amount: true, dueDate: true },
  });
}
