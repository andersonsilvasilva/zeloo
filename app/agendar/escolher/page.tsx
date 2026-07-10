import { getGeneralSettingsAction } from "@/modules/settings/actions/get-general-settings.action";
import { listPublicBarbersAction } from "@/modules/booking/actions/list-public-barbers.action";
import { listPublicServicesAction } from "@/modules/booking/actions/list-public-services.action";
import { BookingHeader } from "@/modules/booking/components/booking-header";
import { SelectionForm } from "@/modules/booking/components/selection-form";

export default async function EscolherPage() {
  const [settings, barbers, services] = await Promise.all([
    getGeneralSettingsAction(),
    listPublicBarbersAction(),
    listPublicServicesAction(),
  ]);

  return (
    <div>
      <BookingHeader logoUrl={settings.logoUrl} businessName={settings.name} backHref="/agendar" />
      <h1 className="mb-1 text-lg font-semibold text-booking-text">Vamos agendar!</h1>
      <p className="mb-6 text-sm text-booking-text-secondary">Escolha seu profissional e o serviço desejado.</p>
      <SelectionForm barbers={barbers} services={services} />
    </div>
  );
}
