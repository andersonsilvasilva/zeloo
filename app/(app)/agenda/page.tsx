import { hasPermission } from "@/lib/auth/rbac";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { ComingSoon } from "@/components/shared/coming-soon";
import { PrintButton } from "@/components/shared/print-button";
import { PrintHeader } from "@/components/shared/print-header";
import { listAppointmentsAction } from "@/modules/appointments/actions/list-appointments.action";
import { getAppointmentFormOptionsAction } from "@/modules/appointments/actions/get-appointment-form-options.action";
import { getGeneralSettingsAction } from "@/modules/settings/actions/get-general-settings.action";
import { AppointmentFilters } from "@/modules/appointments/components/appointment-filters";
import { AppointmentList } from "@/modules/appointments/components/appointment-list";
import { NewAppointmentButton } from "@/modules/appointments/components/new-appointment-button";
import { DateRangeFilters } from "@/components/shared/date-range-filters";
import { formatDateOnly, formatDateOnlyBR, parseDateOnly } from "@/modules/appointments/utils/date-only";
import { todayInTimezone } from "@/lib/utils/timezone";
import type { AppointmentStatus } from "@/modules/appointments/types/appointment.types";

export default async function AgendaPage({
  searchParams,
}: {
  searchParams: { dateFrom?: string; dateTo?: string; professionalId?: string; status?: string };
}) {
  const canView = await hasPermission(PERMISSIONS.appointments.view);
  if (!canView) return <ComingSoon title="Agenda" />;

  const [canCreate, canUpdate, canCancel, canSendMessages, canRegisterPayment, canDelete] = await Promise.all([
    hasPermission(PERMISSIONS.appointments.create),
    hasPermission(PERMISSIONS.appointments.update),
    hasPermission(PERMISSIONS.appointments.cancel),
    hasPermission(PERMISSIONS.messages.send),
    hasPermission(PERMISSIONS.finance.create),
    hasPermission(PERMISSIONS.appointments.delete),
  ]);

  const settings = await getGeneralSettingsAction();
  const today = formatDateOnly(todayInTimezone(settings.timezone));
  const dateFrom = searchParams.dateFrom || today;
  const dateTo = searchParams.dateTo || today;
  const professionalId = searchParams.professionalId || "";
  const status = searchParams.status || "";

  const [options, appointments] = await Promise.all([
    getAppointmentFormOptionsAction(),
    listAppointmentsAction({
      dateFrom: parseDateOnly(dateFrom),
      dateTo: parseDateOnly(dateTo),
      professionalId: professionalId || undefined,
      status: (status || undefined) as AppointmentStatus | undefined,
    }),
  ]);

  const periodLabel = `Período: ${formatDateOnlyBR(parseDateOnly(dateFrom))} a ${formatDateOnlyBR(parseDateOnly(dateTo))}`;

  return (
    <div className="space-y-6">
      <PrintHeader logoUrl={settings.logoUrl} businessName={settings.name} title="Agenda" subtitle={periodLabel} />

      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div>
          <h1 className="text-2xl font-semibold text-text">Agenda</h1>
          <p className="text-sm text-text-secondary">Serviço → profissional → data → horário.</p>
        </div>
        <div className="flex items-center gap-2">
          <PrintButton label="Imprimir agenda" />
          {canCreate && <NewAppointmentButton options={options} />}
        </div>
      </div>

      <div className="print:hidden">
        <DateRangeFilters dateFrom={dateFrom} dateTo={dateTo} />
        <div className="mt-3">
          <AppointmentFilters professionalId={professionalId} status={status} professionals={options.professionals} />
        </div>
      </div>

      <AppointmentList
        appointments={appointments}
        options={options}
        canUpdate={canUpdate}
        canCancel={canCancel}
        canSendMessages={canSendMessages}
        canRegisterPayment={canRegisterPayment}
        canDelete={canDelete}
        timezone={settings.timezone}
      />
    </div>
  );
}
