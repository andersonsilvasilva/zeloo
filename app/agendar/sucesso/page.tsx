import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { getGeneralSettingsAction } from "@/modules/settings/actions/get-general-settings.action";
import { formatCurrency } from "@/lib/utils/format";
import { formatDateOnlyBR } from "@/modules/appointments/utils/date-only";
import { formatInBarbershopTz } from "@/lib/utils/timezone";
import { BookingHeader } from "@/modules/booking/components/booking-header";
import { getPublicAppointmentSummaryAction } from "@/modules/booking/actions/get-public-appointment-summary.action";
import { requireCurrentTenant } from "@/lib/tenancy/current-tenant";

// Mesmo motivo de app/agendar/page.tsx — sem isso, settings ficam "congelados"
// com os dados do banco usado no build (e agora, com isolamento de tenant da
// Fase 4, o build nem teria contexto de tenant pra essa leitura funcionar).
export const dynamic = "force-dynamic";

export default async function SucessoPage({
  searchParams,
}: {
  searchParams: { appointmentId?: string };
}) {
  // Fase 14 (spec §67) — resposta controlada pra subdomínio de tenant
  // inexistente, ver app/login/page.tsx.
  await requireCurrentTenant();

  const settings = await getGeneralSettingsAction();

  if (!searchParams.appointmentId) {
    return (
      <div>
        <BookingHeader logoUrl={settings.logoUrl} businessName={settings.name} />
        <p className="text-center text-sm text-booking-text-secondary">Agendamento não encontrado.</p>
      </div>
    );
  }

  const result = await getPublicAppointmentSummaryAction({ id: searchParams.appointmentId });

  return (
    <div>
      <BookingHeader logoUrl={settings.logoUrl} businessName={settings.name} />

      {!result.success ? (
        <p className="text-center text-sm text-booking-text-secondary">{result.error}</p>
      ) : (
        <div className="flex flex-col items-center text-center">
          <CheckCircle2 size={56} className="text-booking-primary" />
          <h1 className="mt-4 text-xl font-bold text-booking-text">Prontinho, agendamento confirmado!</h1>
          <p className="mt-1 text-sm text-booking-text-secondary">
            {result.appointment.client.name}, te esperamos no horário marcado.
          </p>

          <div className="mt-6 w-full space-y-3 rounded-xl bg-booking-card p-4 text-left text-booking-card-foreground">
            <div>
              <p className="text-xs uppercase tracking-wide opacity-70">Profissional</p>
              <p className="font-semibold">{result.appointment.professional.professionalName}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide opacity-70">Serviço(s)</p>
              <p className="font-semibold">{result.appointment.services.map((s) => s.name).join(", ")}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide opacity-70">Data e horário</p>
              <p className="font-semibold">
                {formatDateOnlyBR(result.appointment.appointmentDate)} às{" "}
                {formatInBarbershopTz(result.appointment.startTime, settings.timezone, "HH:mm")}
              </p>
            </div>
            <div className="flex items-center justify-between border-t border-black/10 pt-3">
              <span className="text-sm">Total</span>
              <span className="text-lg font-bold">{formatCurrency(result.appointment.totalPrice)}</span>
            </div>
          </div>
        </div>
      )}

      <Link
        href="/agendar"
        className="mt-8 block w-full rounded-full bg-booking-text px-6 py-3 text-center text-sm font-semibold text-booking-bg transition-opacity hover:opacity-90 focus-gold"
      >
        Voltar ao início
      </Link>
    </div>
  );
}
