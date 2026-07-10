"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Scissors } from "lucide-react";
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
          <div className="flex flex-wrap gap-2">
            {barbers.map((barber) => (
              <button
                key={barber.id}
                type="button"
                onClick={() => setBarberId(barber.id)}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors focus-gold",
                  barberId === barber.id
                    ? "bg-booking-primary text-booking-bg"
                    : "border border-booking-border text-booking-text hover:border-booking-primary",
                )}
              >
                {barber.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={barber.photoUrl} alt={barber.professionalName} className="h-6 w-6 rounded-full object-cover" />
                ) : (
                  <Scissors size={14} />
                )}
                {barber.professionalName}
              </button>
            ))}
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
                    "w-full rounded-xl bg-booking-card px-4 py-3 text-left text-booking-card-foreground transition-shadow focus-gold",
                    selected ? "ring-2 ring-booking-primary" : "opacity-90 hover:opacity-100",
                  )}
                >
                  <p className="font-semibold">{service.name}</p>
                  <p className="mt-1 text-sm">
                    Valor: {formatCurrency(service.price)} · Tempo: {service.durationMinutes}min
                  </p>
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
