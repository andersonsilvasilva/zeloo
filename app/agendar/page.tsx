import Link from "next/link";
import { Scissors } from "lucide-react";
import { getGeneralSettingsAction } from "@/modules/settings/actions/get-general-settings.action";

export default async function AgendarLandingPage() {
  const settings = await getGeneralSettingsAction();

  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center text-center">
      <div className="flex h-[340px] w-[340px] items-center justify-center rounded-full border-4 border-booking-primary bg-booking-bg shadow-[0_0_30px_rgba(232,185,35,0.25)]">
        {settings.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={settings.logoUrl} alt={settings.name} className="h-[300px] w-[300px] rounded-full object-contain" />
        ) : (
          <Scissors size={56} className="text-booking-primary" />
        )}
      </div>

      <h1 className="mt-6 text-2xl font-bold text-booking-text">{settings.name}</h1>

      <p className="mt-3 max-w-xs text-sm font-medium uppercase tracking-wide text-booking-primary">
        Um jeito único para você se diferenciar
      </p>

      <Link
        href="/agendar/escolher"
        className="mt-10 w-full max-w-xs rounded-full bg-booking-text px-6 py-3 text-center text-sm font-semibold text-booking-bg transition-opacity hover:opacity-90 focus-gold"
      >
        Agendar horário
      </Link>
    </div>
  );
}
