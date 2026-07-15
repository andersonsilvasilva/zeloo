export interface DashboardCounts {
  day: number;
  week: number;
  month: number;
  year: number;
}

export interface DashboardRevenue {
  day: number;
  week: number;
  month: number;
  year: number;
}

export interface NamedTotal {
  name: string;
  total: number;
}

export interface NamedCount {
  name: string;
  count: number;
}

export interface RevenueTrendPoint {
  date: string;
  total: number;
}

export interface AccountsTrendPoint {
  date: string;
  payable: number;
  receivable: number;
}

export interface DashboardMetrics {
  counts: DashboardCounts;
  revenue: DashboardRevenue;
  averageTicket: number;
  topClient: NamedTotal | null;
  topService: NamedCount | null;
  topProfessionalByRevenue: NamedTotal | null;
  topProfessionalByAppointments: NamedCount | null;
  revenueTrend: RevenueTrendPoint[];
  serviceDistribution: NamedCount[];
  professionalPerformance: NamedTotal[];
  accountsTrendDaily: AccountsTrendPoint[];
  accountsTrendMonthly: AccountsTrendPoint[];
}
