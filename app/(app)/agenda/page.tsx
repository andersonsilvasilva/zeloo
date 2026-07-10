import { format } from "date-fns";
import { hasPermission } from "@/lib/auth/rbac";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { ComingSoon } from "@/components/shared/coming-soon";
import { listAppointmentsAction } from "@/modules/appointments/actions/list-appointments.action";
import { getAppointmentFormOptionsAction } from "@/modules/appointments/actions/get-appointment-form-options.action";
import { AppointmentFilters } from "@/modules/appointments/components/appointment-filters";
import { AppointmentList } from "@/modules/appointments/components/appointment-list";
import { NewAppointmentButton } from "@/modules/appointments/components/new-appointment-button";
import { parseDateOnly } from "@/modules/appointments/utils/date-only";
import type { AppointmentStatus } from "@/modules/appointments/types/appointment.types";

export default async function AgendaPage({
  searchParams,
}: {
  searchParams: { date?: string; barberId?: string; status?: string };
}) {
  const canView = await hasPermission(PERMISSIONS.appointments.view);
  if (!canView) return <ComingSoon title="Agenda" />;

  const [canCreate, canUpdate, canCancel, canSendMessages, canRegisterPayment] = await Promise.all([
    hasPermission(PERMISSIONS.appointments.create),
    hasPermission(PERMISSIONS.appointments.update),
    hasPermission(PERMISSIONS.appointments.cancel),
    hasPermission(PERMISSIONS.messages.send),
    hasPermission(PERMISSIONS.finance.create),
  ]);

  const date = searchParams.date || format(new Date(), "yyyy-MM-dd");
  const barberId = searchParams.barberId || "";
  const status = searchParams.status || "";
  const selectedDate = parseDateOnly(date);

  const [options, appointments] = await Promise.all([
    getAppointmentFormOptionsAction(),
    listAppointmentsAction({
      dateFrom: selectedDate,
      dateTo: selectedDate,
      barberId: barberId || undefined,
      status: (status || undefined) as AppointmentStatus | undefined,
    }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-text">Agenda</h1>
          <p className="text-sm text-text-secondary">Serviço → barbeiro → data → horário.</p>
        </div>
        {canCreate && <NewAppointmentButton options={options} />}
      </div>

      <AppointmentFilters date={date} barberId={barberId} status={status} barbers={options.barbers} />

      <AppointmentList
        appointments={appointments}
        options={options}
        canUpdate={canUpdate}
        canCancel={canCancel}
        canSendMessages={canSendMessages}
        canRegisterPayment={canRegisterPayment}
      />
    </div>
  );
}
