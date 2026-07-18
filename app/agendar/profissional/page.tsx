import { redirect } from "next/navigation";
import { getGeneralSettingsAction } from "@/modules/settings/actions/get-general-settings.action";
import { getPublicProfessionalProfileAction } from "@/modules/booking/actions/get-public-professional-profile.action";
import { BookingHeader } from "@/modules/booking/components/booking-header";
import { ProfessionalProfile } from "@/modules/booking/components/professional-profile";
import { requireCurrentTenant } from "@/lib/tenancy/current-tenant";

// Mesmo motivo de app/agendar/page.tsx — sem isso, settings ficam "congelados"
// com os dados do banco usado no build (e agora, com isolamento de tenant da
// Fase 4, o build nem teria contexto de tenant pra essa leitura funcionar).
export const dynamic = "force-dynamic";

export default async function ProfissionalPage({
  searchParams,
}: {
  searchParams: { professionalId?: string };
}) {
  if (!searchParams.professionalId) redirect("/agendar/escolher");

  // Fase 14 (spec §67) — resposta controlada pra subdomínio de tenant
  // inexistente, ver app/login/page.tsx.
  await requireCurrentTenant();

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
