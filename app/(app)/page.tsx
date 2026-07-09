import Link from "next/link";
import { auth } from "@/lib/auth/auth";
import { getSessionPermissions, hasPermission } from "@/lib/auth/rbac";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { NAV_ITEMS } from "@/components/shared/nav-items";
import { getDashboardMetricsAction } from "@/modules/reports/actions/get-dashboard-metrics.action";
import { getGeneralSettingsAction } from "@/modules/settings/actions/get-general-settings.action";
import { getClientBirthdaysAction } from "@/modules/clients/actions/get-client-birthdays.action";
import { listTodayAppointmentsAction } from "@/modules/appointments/actions/list-today-appointments.action";
import { StatCard } from "@/modules/reports/components/stat-card";
import { RevenueLineChart } from "@/modules/reports/components/revenue-line-chart";
import { ServicePieChart } from "@/modules/reports/components/service-pie-chart";
import { BarberBarChart } from "@/modules/reports/components/barber-bar-chart";
import { BirthdaysBox } from "@/modules/clients/components/birthdays-box";
import { TodayScheduleBox } from "@/modules/appointments/components/today-schedule-box";
import { formatCurrency, formatCompactNumber } from "@/lib/utils/format";

export default async function DashboardPage() {
  const session = await auth();
  const userName = session?.user?.name ?? "usuário";
  const canViewReports = await hasPermission(PERMISSIONS.reports.view);

  if (!canViewReports) {
    return <WelcomeFallback userName={userName} />;
  }

  const [canViewClients, canViewAppointments] = await Promise.all([
    hasPermission(PERMISSIONS.clients.view),
    hasPermission(PERMISSIONS.appointments.view),
  ]);

  const [metrics, settings, birthdays, todayAppointments] = await Promise.all([
    getDashboardMetricsAction(),
    getGeneralSettingsAction(),
    canViewClients ? getClientBirthdaysAction() : Promise.resolve(null),
    canViewAppointments ? listTodayAppointmentsAction() : Promise.resolve(null),
  ]);

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        {settings.logoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={settings.logoUrl}
            alt="Logomarca da barbearia"
            className="h-12 w-12 shrink-0 rounded-lg border border-border object-contain"
          />
        )}
        <div>
          <h1 className="text-2xl font-semibold text-text">Olá, {userName}</h1>
          <p className="text-sm text-text-secondary">Visão geral do desempenho da barbearia.</p>
        </div>
      </div>

      {todayAppointments && <TodayScheduleBox appointments={todayAppointments} />}

      {birthdays && <BirthdaysBox data={birthdays} />}

      <section className="space-y-3">
        <h2 className="text-sm font-medium uppercase tracking-wide text-text-secondary">
          Atendimentos
        </h2>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard label="Hoje" value={formatCompactNumber(metrics.counts.day)} />
          <StatCard label="Esta semana" value={formatCompactNumber(metrics.counts.week)} />
          <StatCard label="Este mês" value={formatCompactNumber(metrics.counts.month)} />
          <StatCard label="Este ano" value={formatCompactNumber(metrics.counts.year)} />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium uppercase tracking-wide text-text-secondary">
          Faturamento
        </h2>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard label="Hoje" value={formatCurrency(metrics.revenue.day)} />
          <StatCard label="Esta semana" value={formatCurrency(metrics.revenue.week)} />
          <StatCard label="Este mês" value={formatCurrency(metrics.revenue.month)} />
          <StatCard label="Este ano" value={formatCurrency(metrics.revenue.year)} />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium uppercase tracking-wide text-text-secondary">
          Indicadores (mês atual)
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <StatCard label="Ticket médio" value={formatCurrency(metrics.averageTicket)} />
          <StatCard
            label="Cliente que mais gastou"
            value={metrics.topClient?.name ?? "—"}
            caption={metrics.topClient ? formatCurrency(metrics.topClient.total) : undefined}
          />
          <StatCard
            label="Serviço mais vendido"
            value={metrics.topService?.name ?? "—"}
            caption={metrics.topService ? `${metrics.topService.count} venda(s)` : undefined}
          />
          <StatCard
            label="Barbeiro com maior lucro"
            value={metrics.topBarberByRevenue?.name ?? "—"}
            caption={metrics.topBarberByRevenue ? formatCurrency(metrics.topBarberByRevenue.total) : undefined}
          />
          <StatCard
            label="Barbeiro com mais atendimentos"
            value={metrics.topBarberByAppointments?.name ?? "—"}
            caption={
              metrics.topBarberByAppointments
                ? `${metrics.topBarberByAppointments.count} atendimento(s)`
                : undefined
            }
          />
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-5 xl:col-span-2">
          <h2 className="mb-4 text-sm font-medium text-text">
            Evolução de faturamento (últimos 30 dias)
          </h2>
          <RevenueLineChart data={metrics.revenueTrend} />
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="mb-4 text-sm font-medium text-text">Distribuição de serviços (mês atual)</h2>
          <ServicePieChart data={metrics.serviceDistribution} />
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="mb-4 text-sm font-medium text-text">Desempenho dos barbeiros (mês atual)</h2>
          <BarberBarChart data={metrics.barberPerformance} />
        </div>
      </section>
    </div>
  );
}

async function WelcomeFallback({ userName }: { userName: string }) {
  const permissions = await getSessionPermissions();
  const canViewClients = permissions.has(PERMISSIONS.clients.view);
  const canViewAppointments = permissions.has(PERMISSIONS.appointments.view);
  const quickLinks = NAV_ITEMS.filter(
    (item) => item.href !== "/" && (!item.permission || permissions.has(item.permission)),
  );

  const [birthdays, todayAppointments] = await Promise.all([
    canViewClients ? getClientBirthdaysAction() : Promise.resolve(null),
    canViewAppointments ? listTodayAppointmentsAction() : Promise.resolve(null),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-text">Olá, {userName}</h1>
        <p className="text-sm text-text-secondary">Bem-vindo ao painel da Barbershop SaaS.</p>
      </div>

      {todayAppointments && <TodayScheduleBox appointments={todayAppointments} />}

      {birthdays && <BirthdaysBox data={birthdays} />}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {quickLinks.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary focus-gold"
          >
            <p className="font-medium text-text">{item.label}</p>
            <p className="mt-1 text-sm text-text-secondary">Acessar {item.label.toLowerCase()}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
