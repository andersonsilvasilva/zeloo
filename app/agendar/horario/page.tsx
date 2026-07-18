import { redirect } from "next/navigation";
import { getGeneralSettingsAction } from "@/modules/settings/actions/get-general-settings.action";
import { BookingHeader } from "@/modules/booking/components/booking-header";
import { SchedulePicker } from "@/modules/booking/components/schedule-picker";
import { requireCurrentTenant } from "@/lib/tenancy/current-tenant";

// Mesmo motivo de app/agendar/page.tsx — sem isso, settings ficam "congelados"
// com os dados do banco usado no build (e agora, com isolamento de tenant da
// Fase 4, o build nem teria contexto de tenant pra essa leitura funcionar).
export const dynamic = "force-dynamic";

export default async function HorarioPage({
  searchParams,
}: {
  searchParams: { professionalId?: string; serviceIds?: string; clientId?: string; phone?: string };
}) {
  const { professionalId, serviceIds, clientId, phone } = searchParams;
  if (!professionalId || !serviceIds || !clientId || !phone) redirect("/agendar/escolher");

  // Fase 14 (spec §67) — resposta controlada pra subdomínio de tenant
  // inexistente, ver app/login/page.tsx.
  await requireCurrentTenant();

  const settings = await getGeneralSettingsAction();

  return (
    <div>
      <BookingHeader
        logoUrl={settings.logoUrl}
        businessName={settings.name}
        backHref={`/agendar/identificacao?professionalId=${professionalId}&serviceIds=${serviceIds}`}
      />
      <h1 className="mb-1 text-lg font-semibold text-booking-text">Escolha o melhor horário</h1>
      <p className="mb-6 text-sm text-booking-text-secondary">Selecione o dia e o horário que funcionam para você.</p>
      <SchedulePicker
        professionalId={professionalId}
        serviceIds={serviceIds}
        clientId={clientId}
        phone={phone}
        timezone={settings.timezone}
      />
    </div>
  );
}
