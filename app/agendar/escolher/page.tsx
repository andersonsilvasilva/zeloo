import { getGeneralSettingsAction } from "@/modules/settings/actions/get-general-settings.action";
import { listPublicProfessionalsAction } from "@/modules/booking/actions/list-public-professionals.action";
import { BookingHeader } from "@/modules/booking/components/booking-header";
import { SelectionForm } from "@/modules/booking/components/selection-form";
import { requireCurrentTenant } from "@/lib/tenancy/current-tenant";

/**
 * Sem isso, o Next pré-renderiza essa página como estática no build — e a
 * lista de profissionais fica "congelada" com os dados do banco usado no
 * momento do build. Como o build roda localmente (contra o banco de
 * staging), um deploy pode sobrescrever a página com nomes/fotos
 * desatualizados em relação ao que o usuário já editou direto em produção
 * (aconteceu em 2026-07-15: profissionais renomeados/fotos trocadas em
 * produção sumiram após um deploy que não tocava nesse fluxo).
 */
export const dynamic = "force-dynamic";

export default async function EscolherPage() {
  // Fase 14 (spec §67) — resposta controlada pra subdomínio de tenant
  // inexistente, ver app/login/page.tsx.
  await requireCurrentTenant();

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
