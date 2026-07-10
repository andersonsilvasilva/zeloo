import { redirect } from "next/navigation";
import { getGeneralSettingsAction } from "@/modules/settings/actions/get-general-settings.action";
import { BookingHeader } from "@/modules/booking/components/booking-header";
import { IdentificationForm } from "@/modules/booking/components/identification-form";

export default async function IdentificacaoPage({
  searchParams,
}: {
  searchParams: { barberId?: string; serviceIds?: string };
}) {
  const { barberId, serviceIds } = searchParams;
  if (!barberId || !serviceIds) redirect("/agendar/escolher");

  const settings = await getGeneralSettingsAction();

  return (
    <div>
      <BookingHeader
        logoUrl={settings.logoUrl}
        businessName={settings.name}
        backHref={`/agendar/escolher`}
      />
      <h1 className="mb-1 text-lg font-semibold text-booking-text">Quase lá!</h1>
      <p className="mb-6 text-sm text-booking-text-secondary">
        É rapidinho — só precisamos do seu nome e telefone para confirmar seu horário.
      </p>
      <IdentificationForm barberId={barberId} serviceIds={serviceIds} />
    </div>
  );
}
