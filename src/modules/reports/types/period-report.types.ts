import type { NamedCount, NamedTotal, RevenueTrendPoint } from "@/modules/reports/types/dashboard.types";

export interface PaymentMethodTotal {
  method: string;
  total: number;
}

export interface AppointmentStatusCount {
  status: string;
  count: number;
}

export interface BarberPerformanceRow {
  id: string;
  name: string;
  count: number;
  revenue: number;
  commissionPercentage: number;
  commission: number;
}

export interface PeriodReport {
  dateFrom: Date;
  dateTo: Date;
  totalRevenue: number;
  appointmentsCompleted: number;
  averageTicket: number;
  revenueTrend: RevenueTrendPoint[];
  revenueByPaymentMethod: PaymentMethodTotal[];
  appointmentsByStatus: AppointmentStatusCount[];
  serviceDistribution: NamedCount[];
  servicesByRevenue: NamedTotal[];
  barberPerformance: BarberPerformanceRow[];
  topClients: NamedTotal[];
  /** true quando o relatório foi restrito ao próprio barbeiro (usuário sem finance.view). */
  scopedToOwnBarber: boolean;
}
