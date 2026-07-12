"use client";

import { cn } from "@/lib/utils/cn";
import { formatInBarbershopTz } from "@/lib/utils/timezone";
import type { TimeSlot } from "@/modules/appointments/types/appointment.types";

export interface TimeSlotPickerProps {
  slots: TimeSlot[];
  selected: Date | null;
  onSelect: (slot: TimeSlot) => void;
  loading: boolean;
  timezone: string;
}

export function TimeSlotPicker({ slots, selected, onSelect, loading, timezone }: TimeSlotPickerProps) {
  if (loading) {
    return <p className="text-sm text-text-secondary">Carregando horários...</p>;
  }

  if (slots.length === 0) {
    return (
      <p className="text-sm text-text-secondary">
        Selecione o serviço, o profissional e a data para ver os horários disponíveis.
      </p>
    );
  }

  const hasAvailable = slots.some((s) => s.available);
  if (!hasAvailable) {
    return <p className="text-sm text-danger">Nenhum horário disponível nesta data.</p>;
  }

  return (
    <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
      {slots.map((slot) => {
        const isSelected = selected?.getTime() === slot.start.getTime();
        return (
          <button
            key={slot.start.toISOString()}
            type="button"
            disabled={!slot.available}
            onClick={() => onSelect(slot)}
            className={cn(
              "h-9 rounded-lg border text-sm transition-colors focus-gold",
              !slot.available && "cursor-not-allowed border-border/50 text-text-secondary/40 line-through",
              slot.available && !isSelected && "border-border text-text hover:border-primary",
              isSelected && "border-primary bg-primary text-primary-foreground",
            )}
          >
            {formatInBarbershopTz(slot.start, timezone, "HH:mm")}
          </button>
        );
      })}
    </div>
  );
}
