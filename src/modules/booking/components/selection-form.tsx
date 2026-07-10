"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Scissors } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import { formatCurrency } from "@/lib/utils/format";
import type { PublicBarberOption, PublicServiceOption } from "@/modules/booking/types/booking.types";

export interface SelectionFormProps {
  barbers: PublicBarberOption[];
  services: PublicServiceOption[];
}

export function SelectionForm({ barbers, services }: SelectionFormProps) {
  const router = useRouter();
  const [barberId, setBarberId] = useState<string | null>(null);
  const [serviceIds, setServiceIds] = useState<string[]>([]);

  function toggleService(id: string) {
    setServiceIds((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));
  }

  const canContinue = Boolean(barberId) && serviceIds.length > 0;

  function handleContinue() {
    const params = new URLSearchParams({ barberId: barberId as string, serviceIds: serviceIds.join(",") });
    router.push(`/agendar/identificacao?${params.toString()}`);
  }

  return (
    <div className="space-y-8">
      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-booking-primary">Profissional</h2>
        {barbers.length === 0 ? (
          <p className="text-sm text-booking-text-secondary">Nenhum profissional disponível no momento.</p>
        ) : (
          <div className="flex flex-wrap gap-3">
            {barbers.map((barber) => {
              const selected = barberId === barber.id;
              return (
                <button
                  key={barber.id}
                  type="button"
                  onClick={() => setBarberId(barber.id)}
                  className={cn(
                    "flex items-center gap-2 rounded-full py-2 pl-2 pr-4 text-sm font-semibold transition-all focus-gold",
                    selected
                      ? "scale-[1.03] bg-booking-primary text-booking-bg shadow-[0_6px_16px_-4px_rgba(232,185,35,0.6)]"
                      : "border border-booking-border text-booking-text hover:border-booking-primary",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full",
                      selected ? "bg-booking-bg/20" : "bg-black/20",
                    )}
                  >
                    {barber.photoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={barber.photoUrl} alt={barber.professionalName} className="h-full w-full object-cover" />
                    ) : (
                      <Scissors size={14} />
                    )}
                  </span>
                  {barber.professionalName}
                  {selected && <Check size={14} strokeWidth={3} />}
                </button>
              );
            })}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-booking-primary">Serviço</h2>
        {services.length === 0 ? (
          <p className="text-sm text-booking-text-secondary">Nenhum serviço disponível no momento.</p>
        ) : (
          <div className="space-y-3">
            {services.map((service) => {
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
        disabled={!canContinue}
        onClick={handleContinue}
      >
        Continuar
      </Button>
    </div>
  );
}
