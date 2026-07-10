import { redirect } from "next/navigation";
import { getGeneralSettingsAction } from "@/modules/settings/actions/get-general-settings.action";
import { BookingHeader } from "@/modules/booking/components/booking-header";
import { SchedulePicker } from "@/modules/booking/components/schedule-picker";

export default async function HorarioPage({
  searchParams,
}: {
  searchParams: { barberId?: string; serviceIds?: string; clientId?: string; phone?: string };
}) {
  const { barberId, serviceIds, clientId, phone } = searchParams;
  if (!barberId || !serviceIds || !clientId || !phone) redirect("/agendar/escolher");

  const settings = await getGeneralSettingsAction();

  return (
    <div>
      <BookingHeader
        logoUrl={settings.logoUrl}
        businessName={settings.name}
        backHref={`/agendar/identificacao?barberId=${barberId}&serviceIds=${serviceIds}`}
      />
      <h1 className="mb-1 text-lg font-semibold text-booking-text">Escolha o melhor horário</h1>
      <p className="mb-6 text-sm text-booking-text-secondary">Selecione o dia e o horário que funcionam para você.</p>
      <SchedulePicker barberId={barberId} serviceIds={serviceIds} clientId={clientId} phone={phone} />
    </div>
  );
}
