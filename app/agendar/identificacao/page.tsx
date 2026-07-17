import { redirect } from "next/navigation";
import { getGeneralSettingsAction } from "@/modules/settings/actions/get-general-settings.action";
import { BookingHeader } from "@/modules/booking/components/booking-header";
import { IdentificationForm } from "@/modules/booking/components/identification-form";
import { requireCurrentTenant } from "@/lib/tenancy/current-tenant";

// Mesmo motivo de app/agendar/page.tsx — sem isso, settings ficam "congelados"
// com os dados do banco usado no build (e agora, com isolamento de tenant da
// Fase 4, o build nem teria contexto de tenant pra essa leitura funcionar).
export const dynamic = "force-dynamic";

export default async function IdentificacaoPage({
  searchParams,
}: {
  searchParams: { professionalId?: string; serviceIds?: string };
}) {
  const { professionalId, serviceIds } = searchParams;
  if (!professionalId || !serviceIds) redirect("/agendar/escolher");

  // Fase 14 (spec §67) — resposta controlada pra subdomínio de tenant
  // inexistente, ver app/login/page.tsx.
  await requireCurrentTenant();

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
      <IdentificationForm professionalId={professionalId} serviceIds={serviceIds} />
    </div>
  );
}
