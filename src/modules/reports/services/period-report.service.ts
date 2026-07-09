import { addDays, format, startOfDay } from "date-fns";
import type { DateRange } from "@/modules/reports/repositories/dashboard.repository";
import {
  countAppointmentsByStatusInRange,
  findBarberIdByUserId,
  findCompletedAppointmentsInRangeDetailed,
  findPaidPaymentsInRangeWithMethod,
} from "@/modules/reports/repositories/period-report.repository";
import type { PeriodReportFiltersInput } from "@/modules/reports/schemas/period-report.schema";
import type {
  BarberPerformanceRow,
  PaymentMethodTotal,
  PeriodReport,
} from "@/modules/reports/types/period-report.types";
import type { NamedCount, NamedTotal, RevenueTrendPoint } from "@/modules/reports/types/dashboard.types";

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  CASH: "Dinheiro",
  PIX: "Pix",
  CREDIT_CARD: "Cartão de crédito",
  DEBIT_CARD: "Cartão de débito",
  OTHER: "Outro",
};

const TOP_CLIENTS_LIMIT = 10;

export interface GetPeriodReportOptions {
  userId: string;
  /** Usuários sem finance.view (ex.: BARBER) só veem os próprios indicadores. */
  canViewFinance: boolean;
}

/**
 * Relatórios com período customizável (diferente do dashboard, que usa
 * buckets fixos de dia/semana/mês/ano). Reforça a regra de que BARBER nunca
 * vê dados financeiros/de outros barbeiros — ver `src/lib/auth/permissions.ts`.
 */
export class PeriodReportService {
  async getReport(filters: PeriodReportFiltersInput, options: GetPeriodReportOptions): Promise<PeriodReport> {
    const range: DateRange = {
      start: startOfDay(filters.dateFrom),
      end: addDays(startOfDay(filters.dateTo), 1),
    };

    let barberId: string | undefined;
    const scopedToOwnBarber = !options.canViewFinance;

    if (scopedToOwnBarber) {
      const barber = await findBarberIdByUserId(options.userId);
      if (!barber) {
        // Papel restrito sem barbeiro vinculado: não há indicador próprio para mostrar.
        return this.emptyReport(filters.dateFrom, filters.dateTo, true);
      }
      barberId = barber.id;
    }

    const [statusGroups, payments, appointments] = await Promise.all([
      countAppointmentsByStatusInRange(range, barberId),
      findPaidPaymentsInRangeWithMethod(range, barberId),
      findCompletedAppointmentsInRangeDetailed(range, barberId),
    ]);

    const clientTotals = new Map<string, NamedTotal>();
    const serviceCounts = new Map<string, NamedCount>();
    const serviceRevenue = new Map<string, NamedTotal>();
    const barberStats = new Map<
      string,
      { name: string; revenue: number; count: number; commissionPercentage: number }
    >();

    for (const appt of appointments) {
      const paid = appt.payments.reduce((sum, p) => sum + p.amount.toNumber(), 0);

      if (paid > 0) {
        const client = clientTotals.get(appt.clientId) ?? { name: appt.client.name, total: 0 };
        client.total += paid;
        clientTotals.set(appt.clientId, client);
      }

      for (const s of appt.services) {
        const count = serviceCounts.get(s.serviceId) ?? { name: s.service.name, count: 0 };
        count.count += 1;
        serviceCounts.set(s.serviceId, count);

        const revenue = serviceRevenue.get(s.serviceId) ?? { name: s.service.name, total: 0 };
        revenue.total += s.price.toNumber();
        serviceRevenue.set(s.serviceId, revenue);
      }

      const barber = barberStats.get(appt.barberId) ?? {
        name: appt.barber.professionalName,
        revenue: 0,
        count: 0,
        commissionPercentage: appt.barber.commissionPercentage.toNumber(),
      };
      barber.revenue += paid;
      barber.count += 1;
      barberStats.set(appt.barberId, barber);
    }

    const totalRevenue = payments.reduce((sum, p) => sum + p.amount.toNumber(), 0);

    const barberPerformance: BarberPerformanceRow[] = [...barberStats.entries()]
      .map(([id, s]) => ({
        id,
        name: s.name,
        count: s.count,
        revenue: s.revenue,
        commissionPercentage: s.commissionPercentage,
        commission: s.revenue * (s.commissionPercentage / 100),
      }))
      .sort((a, b) => b.revenue - a.revenue);

    return {
      dateFrom: filters.dateFrom,
      dateTo: filters.dateTo,
      totalRevenue,
      appointmentsCompleted: appointments.length,
      averageTicket: appointments.length > 0 ? totalRevenue / appointments.length : 0,
      revenueTrend: this.buildRevenueTrend(payments, range),
      revenueByPaymentMethod: this.buildPaymentMethodTotals(payments),
      appointmentsByStatus: statusGroups.map((g) => ({ status: g.status, count: g._count._all })),
      serviceDistribution: [...serviceCounts.values()].sort((a, b) => b.count - a.count),
      servicesByRevenue: [...serviceRevenue.values()].sort((a, b) => b.total - a.total),
      barberPerformance,
      topClients: [...clientTotals.values()].sort((a, b) => b.total - a.total).slice(0, TOP_CLIENTS_LIMIT),
      scopedToOwnBarber,
    };
  }

  private buildPaymentMethodTotals(
    payments: { amount: { toNumber: () => number }; paymentMethod: string }[],
  ): PaymentMethodTotal[] {
    const totals = new Map<string, number>();
    for (const p of payments) {
      totals.set(p.paymentMethod, (totals.get(p.paymentMethod) ?? 0) + p.amount.toNumber());
    }
    return [...totals.entries()]
      .map(([method, total]) => ({ method: PAYMENT_METHOD_LABELS[method] ?? method, total }))
      .sort((a, b) => b.total - a.total);
  }

  private buildRevenueTrend(
    payments: { amount: { toNumber: () => number }; paidAt: Date | null }[],
    range: DateRange,
  ): RevenueTrendPoint[] {
    const totals = new Map<string, number>();
    for (const p of payments) {
      if (!p.paidAt) continue;
      const key = format(p.paidAt, "yyyy-MM-dd");
      totals.set(key, (totals.get(key) ?? 0) + p.amount.toNumber());
    }

    const days = Math.max(1, Math.round((range.end.getTime() - range.start.getTime()) / 86_400_000));
    const series: RevenueTrendPoint[] = [];
    for (let i = 0; i < days; i++) {
      const day = addDays(range.start, i);
      const key = format(day, "yyyy-MM-dd");
      series.push({ date: key, total: totals.get(key) ?? 0 });
    }
    return series;
  }

  private emptyReport(dateFrom: Date, dateTo: Date, scopedToOwnBarber: boolean): PeriodReport {
    return {
      dateFrom,
      dateTo,
      totalRevenue: 0,
      appointmentsCompleted: 0,
      averageTicket: 0,
      revenueTrend: [],
      revenueByPaymentMethod: [],
      appointmentsByStatus: [],
      serviceDistribution: [],
      servicesByRevenue: [],
      barberPerformance: [],
      topClients: [],
      scopedToOwnBarber,
    };
  }
}
