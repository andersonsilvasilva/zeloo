"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  format,
  getDay,
  isBefore,
  isSameDay,
  startOfDay,
  startOfMonth,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import { formatDateOnly } from "@/modules/appointments/utils/date-only";
import { formatInBarbershopTz } from "@/lib/utils/timezone";
import { getPublicAvailableSlotsAction } from "@/modules/booking/actions/get-public-available-slots.action";
import type { TimeSlot } from "@/modules/appointments/types/appointment.types";

const WEEKDAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export interface SchedulePickerProps {
  professionalId: string;
  serviceIds: string;
  clientId: string;
  phone: string;
  timezone: string;
}

export function SchedulePicker({ professionalId, serviceIds, clientId, phone, timezone }: SchedulePickerProps) {
  const router = useRouter();
  const today = startOfDay(new Date());

  const [visibleMonth, setVisibleMonth] = useState(startOfMonth(today));
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [loading, setLoading] = useState(false);

  const serviceIdList = serviceIds.split(",").filter(Boolean);

  useEffect(() => {
    if (!selectedDay) return;
    let cancelled = false;
    setLoading(true);
    setSelectedSlot(null);
    getPublicAvailableSlotsAction({ professionalId, serviceIds: serviceIdList, date: selectedDay }).then((result) => {
      // Evita que a resposta de um dia clicado antes "vença" a corrida e
      // sobrescreva os horários do dia clicado depois (respostas fora de ordem).
      if (cancelled) return;
      setSlots(result);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDay?.getTime()]);

  const days = eachDayOfInterval({ start: startOfMonth(visibleMonth), end: endOfMonth(visibleMonth) });
  const leadingBlanks = getDay(startOfMonth(visibleMonth));

  function handleContinue() {
    if (!selectedDay || !selectedSlot) return;
    const params = new URLSearchParams({
      professionalId,
      serviceIds,
      clientId,
      phone,
      date: formatDateOnly(selectedDay),
      time: selectedSlot.start.toISOString(),
    });
    router.push(`/agendar/confirmar?${params.toString()}`);
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl bg-booking-card p-4 text-booking-card-foreground">
        <div className="mb-3 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setVisibleMonth((m) => addMonths(m, -1))}
            disabled={isBefore(endOfMonth(addMonths(visibleMonth, -1)), today)}
            className="rounded p-1 disabled:opacity-30"
            aria-label="Mês anterior"
          >
            <ChevronLeft size={18} />
          </button>
          <p className="font-semibold capitalize">{format(visibleMonth, "MMMM yyyy", { locale: ptBR })}</p>
          <button
            type="button"
            onClick={() => setVisibleMonth((m) => addMonths(m, 1))}
            className="rounded p-1"
            aria-label="Próximo mês"
          >
            <ChevronRight size={18} />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center text-xs">
          {WEEKDAY_LABELS.map((label) => (
            <span key={label} className="py-1 font-medium">
              {label}
            </span>
          ))}
          {Array.from({ length: leadingBlanks }).map((_, i) => (
            <span key={`blank-${i}`} />
          ))}
          {days.map((day) => {
            const isPast = isBefore(day, today);
            const isSelected = selectedDay && isSameDay(day, selectedDay);
            return (
              <button
                key={day.toISOString()}
                type="button"
                disabled={isPast}
                onClick={() => setSelectedDay(day)}
                className={cn(
                  "rounded py-1.5 text-sm disabled:opacity-30",
                  isSelected ? "bg-booking-bg font-semibold text-booking-primary" : "hover:bg-black/10",
                )}
              >
                {format(day, "d")}
              </button>
            );
          })}
        </div>
      </div>

      {selectedDay && (
        <div>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-booking-primary">
            Selecione um horário
          </h2>
          {loading ? (
            <p className="text-sm text-booking-text-secondary">Buscando horários livres...</p>
          ) : slots.filter((s) => s.available).length === 0 ? (
            <p className="text-sm text-booking-text-secondary">
              Não há horários livres nesse dia — que tal tentar outra data?
            </p>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {slots
                .filter((s) => s.available)
                .map((slot) => {
                  const isSelected = selectedSlot && isSameDay(slot.start, selectedSlot.start) && slot.start.getTime() === selectedSlot.start.getTime();
                  return (
                    <button
                      key={slot.start.toISOString()}
                      type="button"
                      onClick={() => setSelectedSlot(slot)}
                      className={cn(
                        "rounded-lg bg-booking-card py-2 text-sm font-medium text-booking-card-foreground",
                        isSelected ? "ring-2 ring-booking-primary" : "opacity-90 hover:opacity-100",
                      )}
                    >
                      {formatInBarbershopTz(slot.start, timezone, "HH:mm")}
                    </button>
                  );
                })}
            </div>
          )}
        </div>
      )}

      <Button
        type="button"
        className="w-full bg-booking-primary text-booking-bg hover:bg-booking-primary-light"
        disabled={!selectedSlot}
        onClick={handleContinue}
      >
        Continuar
      </Button>
    </div>
  );
}
