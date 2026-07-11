"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Scissors } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import type { PublicBarberOption } from "@/modules/booking/types/booking.types";

export interface SelectionFormProps {
  barbers: PublicBarberOption[];
}

export function SelectionForm({ barbers }: SelectionFormProps) {
  const router = useRouter();
  const [barberId, setBarberId] = useState<string | null>(null);

  function handleContinue() {
    router.push(`/agendar/profissional?barberId=${barberId}`);
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

      <Button
        type="button"
        className="w-full bg-booking-primary text-booking-bg hover:bg-booking-primary-light"
        disabled={!barberId}
        onClick={handleContinue}
      >
        Continuar
      </Button>
    </div>
  );
}
