import { redirect } from "next/navigation";
import { getGeneralSettingsAction } from "@/modules/settings/actions/get-general-settings.action";
import { getPublicProfessionalProfileAction } from "@/modules/booking/actions/get-public-professional-profile.action";
import { BookingHeader } from "@/modules/booking/components/booking-header";
import { ProfessionalProfile } from "@/modules/booking/components/professional-profile";

export default async function ProfissionalPage({
  searchParams,
}: {
  searchParams: { professionalId?: string };
}) {
  if (!searchParams.professionalId) redirect("/agendar/escolher");

  const [settings, result] = await Promise.all([
    getGeneralSettingsAction(),
    getPublicProfessionalProfileAction(searchParams.professionalId),
  ]);

  if (!result.success) redirect("/agendar/escolher");

  return (
    <div>
      <BookingHeader logoUrl={settings.logoUrl} businessName={settings.name} backHref="/agendar/escolher" />
      <ProfessionalProfile profile={result.profile} />
    </div>
  );
}
