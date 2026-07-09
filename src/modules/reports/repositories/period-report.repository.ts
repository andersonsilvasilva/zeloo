import "server-only";
import { prisma } from "@/lib/prisma";
import type { DateRange } from "@/modules/reports/repositories/dashboard.repository";

export function countAppointmentsByStatusInRange(range: DateRange, barberId?: string) {
  return prisma.appointment.groupBy({
    by: ["status"],
    where: { appointmentDate: { gte: range.start, lt: range.end }, barberId },
    _count: { _all: true },
  });
}

export function findPaidPaymentsInRangeWithMethod(range: DateRange, barberId?: string) {
  return prisma.payment.findMany({
    where: {
      status: "PAID",
      paidAt: { gte: range.start, lt: range.end },
      ...(barberId ? { appointment: { barberId } } : {}),
    },
    select: { amount: true, paidAt: true, paymentMethod: true },
  });
}

export function findCompletedAppointmentsInRangeDetailed(range: DateRange, barberId?: string) {
  return prisma.appointment.findMany({
    where: { status: "COMPLETED", appointmentDate: { gte: range.start, lt: range.end }, barberId },
    select: {
      id: true,
      barberId: true,
      barber: { select: { professionalName: true, commissionPercentage: true } },
      clientId: true,
      client: { select: { name: true } },
      services: { select: { serviceId: true, price: true, service: { select: { name: true } } } },
      payments: { where: { status: "PAID" }, select: { amount: true } },
    },
  });
}

export function findBarberIdByUserId(userId: string) {
  return prisma.barber.findUnique({ where: { userId }, select: { id: true } });
}
