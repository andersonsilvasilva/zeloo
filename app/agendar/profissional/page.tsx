import { redirect } from "next/navigation";
import { getGeneralSettingsAction } from "@/modules/settings/actions/get-general-settings.action";
import { getPublicBarberProfileAction } from "@/modules/booking/actions/get-public-barber-profile.action";
import { BookingHeader } from "@/modules/booking/components/booking-header";
import { BarberProfile } from "@/modules/booking/components/barber-profile";

export default async function ProfissionalPage({
  searchParams,
}: {
  searchParams: { barberId?: string };
}) {
  if (!searchParams.barberId) redirect("/agendar/escolher");

  const [settings, result] = await Promise.all([
    getGeneralSettingsAction(),
    getPublicBarberProfileAction(searchParams.barberId),
  ]);

  if (!result.success) redirect("/agendar/escolher");

  return (
    <div>
      <BookingHeader logoUrl={settings.logoUrl} businessName={settings.name} backHref="/agendar/escolher" />
      <BarberProfile profile={result.profile} />
    </div>
  );
}
