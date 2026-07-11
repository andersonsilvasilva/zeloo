"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Scissors } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import { formatCurrency } from "@/lib/utils/format";
import type { PublicBarberProfile } from "@/modules/booking/types/booking.types";

export interface BarberProfileProps {
  profile: PublicBarberProfile;
}

export function BarberProfile({ profile }: BarberProfileProps) {
  const router = useRouter();
  const [serviceIds, setServiceIds] = useState<string[]>([]);

  function toggleService(id: string) {
    setServiceIds((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));
  }

  function handleContinue() {
    const params = new URLSearchParams({ barberId: profile.id, serviceIds: serviceIds.join(",") });
    router.push(`/agendar/identificacao?${params.toString()}`);
  }

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-2xl border border-booking-border bg-gradient-to-b from-booking-primary/[0.07] to-transparent px-6 pb-7 pt-8 text-center">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-0 h-40 w-40 -translate-x-1/2 -translate-y-1/3 rounded-full bg-booking-primary/20 blur-3xl"
        />

        <div className="relative mx-auto flex h-32 w-32 items-center justify-center overflow-hidden rounded-full border-4 border-booking-primary bg-black/30 shadow-[0_0_40px_-8px_rgba(232,185,35,0.55)]">
          {profile.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.photoUrl} alt={profile.professionalName} className="h-full w-full object-cover" />
          ) : (
            <Scissors size={36} className="text-booking-primary" />
          )}
        </div>

        <h1 className="relative mt-5 text-2xl font-bold tracking-tight text-booking-text">
          {profile.professionalName}
        </h1>
        {profile.fullName && profile.fullName !== profile.professionalName && (
          <p className="relative mt-1 text-sm font-medium text-booking-text-secondary">{profile.fullName}</p>
        )}

        {profile.bio && (
          <div className="relative mx-auto mt-5 max-w-md rounded-xl border border-booking-border bg-black/25 p-4">
            <p className="text-sm leading-relaxed text-booking-text-secondary">{profile.bio}</p>
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-booking-primary">
          Serviços oferecidos
        </h2>
        {profile.services.length === 0 ? (
          <p className="text-sm text-booking-text-secondary">
            Esse profissional ainda não tem serviços cadastrados.
          </p>
        ) : (
          <div className="space-y-3">
            {profile.services.map((service) => {
              const selected = serviceIds.includes(service.id);
              return (
                <button
                  key={service.id}
                  type="button"
                  onClick={() => toggleService(service.id)}
                  className={cn(
                    "relative flex w-full items-center gap-3 rounded-xl bg-booking-card p-3 text-left text-booking-card-foreground transition-all focus-gold",
                    selected
                      ? "scale-[1.02] shadow-[0_0_0_2px_#E8B923,0_8px_20px_-6px_rgba(232,185,35,0.5)]"
                      : "opacity-90 hover:opacity-100 hover:shadow-[0_0_0_1px_rgba(232,185,35,0.4)]",
                  )}
                >
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-black/10">
                    {service.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={service.imageUrl} alt={service.name} className="h-full w-full object-cover" />
                    ) : (
                      <Scissors size={22} className="text-booking-card-foreground/50" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{service.name}</p>
                    <p className="mt-1 text-sm opacity-80">
                      {formatCurrency(service.price)} · {service.durationMinutes}min
                    </p>
                  </div>

                  {selected && (
                    <span className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-booking-primary text-booking-bg shadow">
                      <Check size={14} strokeWidth={3} />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </section>

      <Button
        type="button"
        className="w-full bg-booking-primary text-booking-bg hover:bg-booking-primary-light"
        disabled={serviceIds.length === 0}
        onClick={handleContinue}
      >
        Continuar
      </Button>
    </div>
  );
}
