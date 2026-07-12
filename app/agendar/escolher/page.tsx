import { getGeneralSettingsAction } from "@/modules/settings/actions/get-general-settings.action";
import { listPublicProfessionalsAction } from "@/modules/booking/actions/list-public-professionals.action";
import { BookingHeader } from "@/modules/booking/components/booking-header";
import { SelectionForm } from "@/modules/booking/components/selection-form";

export default async function EscolherPage() {
  const [settings, professionals] = await Promise.all([getGeneralSettingsAction(), listPublicProfessionalsAction()]);

  return (
    <div>
      <BookingHeader logoUrl={settings.logoUrl} businessName={settings.name} backHref="/agendar" />
      <h1 className="mb-1 text-lg font-semibold text-booking-text">Vamos agendar!</h1>
      <p className="mb-6 text-sm text-booking-text-secondary">Escolha o profissional que vai te atender.</p>
      <SelectionForm professionals={professionals} />
    </div>
  );
}
