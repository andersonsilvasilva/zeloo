import "server-only";
import {
  startOfDay,
  addDays,
  startOfWeek,
  addWeeks,
  startOfMonth,
  addMonths,
  startOfYear,
  addYears,
  subDays,
  format,
} from "date-fns";
import {
  countCompletedAppointments,
  sumPaidRevenue,
  findCompletedAppointmentsInRange,
  findPaidPaymentsInRange,
  type DateRange,
} from "@/modules/reports/repositories/dashboard.repository";
import type {
  DashboardMetrics,
  NamedCount,
  NamedTotal,
  RevenueTrendPoint,
} from "@/modules/reports/types/dashboard.types";

const REVENUE_TREND_DAYS = 30;
const TOP_SERVICES_LIMIT = 5;

export class DashboardService {
  async getMetrics(): Promise<DashboardMetrics> {
    const now = new Date();

    const dayRange = this.rangeFor(startOfDay(now), (d) => addDays(d, 1));
    const weekRange = this.rangeFor(startOfWeek(now, { weekStartsOn: 1 }), (d) => addWeeks(d, 1));
    const monthRange = this.rangeFor(startOfMonth(now), (d) => addMonths(d, 1));
    const yearRange = this.rangeFor(startOfYear(now), (d) => addYears(d, 1));
    const trendRange: DateRange = {
      start: subDays(startOfDay(now), REVENUE_TREND_DAYS - 1),
      end: addDays(startOfDay(now), 1),
    };

    const [
      dayCount,
      weekCount,
      monthCount,
      yearCount,
      dayRevenue,
      weekRevenue,
      monthRevenue,
      yearRevenue,
      monthAppointments,
      trendPayments,
    ] = await Promise.all([
      countCompletedAppointments(dayRange),
      countCompletedAppointments(weekRange),
      countCompletedAppointments(monthRange),
      countCompletedAppointments(yearRange),
      sumPaidRevenue(dayRange),
      sumPaidRevenue(weekRange),
      sumPaidRevenue(monthRange),
      sumPaidRevenue(yearRange),
      findCompletedAppointmentsInRange(monthRange),
      findPaidPaymentsInRange(trendRange),
    ]);

    const averageTicket = monthAppointments.length > 0 ? monthRevenue / monthAppointments.length : 0;

    const clientTotals = new Map<string, NamedTotal>();
    const serviceCounts = new Map<string, NamedCount>();
    const professionalStats = new Map<string, { name: string; revenue: number; count: number }>();

    for (const appt of monthAppointments) {
      const paid = appt.payments.reduce((sum, p) => sum + p.amount.toNumber(), 0);

      if (paid > 0) {
        const client = clientTotals.get(appt.clientId) ?? { name: appt.client.name, total: 0 };
        client.total += paid;
        clientTotals.set(appt.clientId, client);
      }

      for (const s of appt.services) {
        const service = serviceCounts.get(s.serviceId) ?? { name: s.service.name, count: 0 };
        service.count += 1;
        serviceCounts.set(s.serviceId, service);
      }

      const professional = professionalStats.get(appt.professionalId) ?? {
        name: appt.professional.professionalName,
        revenue: 0,
        count: 0,
      };
      professional.revenue += paid;
      professional.count += 1;
      professionalStats.set(appt.professionalId, professional);
    }

    const topClient = [...clientTotals.values()].sort((a, b) => b.total - a.total)[0] ?? null;
    const serviceEntries = [...serviceCounts.values()].sort((a, b) => b.count - a.count);
    const topService = serviceEntries[0] ?? null;
    const serviceDistribution = this.topNWithOthers(serviceEntries, TOP_SERVICES_LIMIT);

    const professionalList = [...professionalStats.values()];
    const topProfessionalByRevenue = [...professionalList].sort((a, b) => b.revenue - a.revenue)[0];
    const topProfessionalByAppointments = [...professionalList].sort((a, b) => b.count - a.count)[0];
    const professionalPerformance: NamedTotal[] = [...professionalList]
      .sort((a, b) => b.revenue - a.revenue)
      .map((b) => ({ name: b.name, total: b.revenue }));

    return {
      counts: { day: dayCount, week: weekCount, month: monthCount, year: yearCount },
      revenue: { day: dayRevenue, week: weekRevenue, month: monthRevenue, year: yearRevenue },
      averageTicket,
      topClient,
      topService,
      topProfessionalByRevenue: topProfessionalByRevenue
        ? { name: topProfessionalByRevenue.name, total: topProfessionalByRevenue.revenue }
        : null,
      topProfessionalByAppointments: topProfessionalByAppointments
        ? { name: topProfessionalByAppointments.name, count: topProfessionalByAppointments.count }
        : null,
      revenueTrend: this.dailyRevenueSeries(trendPayments, REVENUE_TREND_DAYS, now),
      serviceDistribution,
      professionalPerformance,
    };
  }

  private rangeFor(start: Date, next: (d: Date) => Date): DateRange {
    return { start, end: next(start) };
  }

  private topNWithOthers(entries: NamedCount[], limit: number): NamedCount[] {
    const top = entries.slice(0, limit);
    const rest = entries.slice(limit);
    const othersTotal = rest.reduce((sum, e) => sum + e.count, 0);
    return othersTotal > 0 ? [...top, { name: "Outros", count: othersTotal }] : top;
  }

  private dailyRevenueSeries(
    payments: { amount: { toNumber: () => number }; paidAt: Date | null }[],
    days: number,
    now: Date,
  ): RevenueTrendPoint[] {
    const totals = new Map<string, number>();
    for (const p of payments) {
      if (!p.paidAt) continue;
      const key = format(p.paidAt, "yyyy-MM-dd");
      totals.set(key, (totals.get(key) ?? 0) + p.amount.toNumber());
    }

    const series: RevenueTrendPoint[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const day = subDays(startOfDay(now), i);
      const key = format(day, "yyyy-MM-dd");
      series.push({ date: key, total: totals.get(key) ?? 0 });
    }
    return series;
  }
}
