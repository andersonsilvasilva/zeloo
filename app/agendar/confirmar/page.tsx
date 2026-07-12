import { redirect } from "next/navigation";
import { getGeneralSettingsAction } from "@/modules/settings/actions/get-general-settings.action";
import { formatCurrency } from "@/lib/utils/format";
import { formatDateOnlyBR, parseDateOnly } from "@/modules/appointments/utils/date-only";
import { formatInBarbershopTz } from "@/lib/utils/timezone";
import { BookingHeader } from "@/modules/booking/components/booking-header";
import { ConfirmButton } from "@/modules/booking/components/confirm-button";
import { listPublicProfessionalsAction } from "@/modules/booking/actions/list-public-professionals.action";
import { listPublicServicesAction } from "@/modules/booking/actions/list-public-services.action";

export default async function ConfirmarPage({
  searchParams,
}: {
  searchParams: {
    professionalId?: string;
    serviceIds?: string;
    clientId?: string;
    phone?: string;
    date?: string;
    time?: string;
  };
}) {
  const { professionalId, serviceIds, clientId, phone, date, time } = searchParams;
  if (!professionalId || !serviceIds || !clientId || !phone || !date || !time) redirect("/agendar/escolher");

  const [settings, professionals, services] = await Promise.all([
    getGeneralSettingsAction(),
    listPublicProfessionalsAction(),
    listPublicServicesAction(),
  ]);

  const professional = professionals.find((b) => b.id === professionalId);
  const serviceIdList = serviceIds.split(",").filter(Boolean);
  const selectedServices = services.filter((s) => serviceIdList.includes(s.id));
  const totalPrice = selectedServices.reduce((sum, s) => sum + s.price, 0);
  const totalDuration = selectedServices.reduce((sum, s) => sum + s.durationMinutes, 0);

  const appointmentDate = parseDateOnly(date);
  const startTime = new Date(time);

  return (
    <div>
      <BookingHeader
        logoUrl={settings.logoUrl}
        businessName={settings.name}
        backHref={`/agendar/horario?professionalId=${professionalId}&serviceIds=${serviceIds}&clientId=${clientId}&phone=${phone}`}
      />
      <h1 className="mb-1 text-lg font-semibold text-booking-text">Confirme seu agendamento</h1>
      <p className="mb-6 text-sm text-booking-text-secondary">Dá uma conferida antes de fechar o horário.</p>

      <div className="space-y-3 rounded-xl bg-booking-card p-4 text-booking-card-foreground">
        <div>
          <p className="text-xs uppercase tracking-wide opacity-70">Profissional</p>
          <p className="font-semibold">{professional?.professionalName ?? "—"}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide opacity-70">Serviço(s)</p>
          <p className="font-semibold">{selectedServices.map((s) => s.name).join(", ")}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide opacity-70">Data e horário</p>
          <p className="font-semibold">
            {formatDateOnlyBR(appointmentDate)} às {formatInBarbershopTz(startTime, settings.timezone, "HH:mm")}
          </p>
        </div>
        <div className="flex items-center justify-between border-t border-black/10 pt-3">
          <span className="text-sm">Total ({totalDuration}min)</span>
          <span className="text-lg font-bold">{formatCurrency(totalPrice)}</span>
        </div>
      </div>

      <div className="mt-6">
        <ConfirmButton
          input={{
            clientId,
            phone,
            professionalId,
            serviceIds: serviceIdList,
            appointmentDate,
            startTime,
          }}
        />
      </div>
    </div>
  );
}
