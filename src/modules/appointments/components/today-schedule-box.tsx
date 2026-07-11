"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Clock } from "lucide-react";
import { formatInBarbershopTz } from "@/lib/utils/timezone";
import { AppointmentStatusBadge } from "@/modules/appointments/components/appointment-status-badge";
import type { AppointmentListItem } from "@/modules/appointments/types/appointment.types";

export interface TodayScheduleBoxProps {
  appointments: AppointmentListItem[];
  timezone: string;
}

/** Relógio digital "premium": mostrador estilo LCD embutido, atualiza a cada segundo. */
function LiveClock() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="rounded-lg border border-primary/30 bg-background px-4 py-3 text-center shadow-[inset_0_1px_12px_rgba(0,0,0,0.5)]">
      <p
        className="font-mono text-4xl font-semibold tabular-nums tracking-widest text-primary [text-shadow:0_0_14px_rgba(198,161,91,0.55)]"
        suppressHydrationWarning
      >
        {now ? format(now, "HH:mm:ss") : "--:--:--"}
      </p>
      <p className="mt-1 text-xs uppercase tracking-[0.2em] text-text-secondary" suppressHydrationWarning>
        {now ? format(now, "EEEE, dd 'de' MMMM", { locale: ptBR }) : ""}
      </p>
    </div>
  );
}

export function TodayScheduleBox({ appointments, timezone }: TodayScheduleBoxProps) {
  const showBarberName = new Set(appointments.map((a) => a.barber.id)).size > 1;

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="mb-4 flex items-center gap-2">
        <Clock className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-medium text-text">Agenda de hoje</h2>
      </div>

      <LiveClock />

      <div className="mt-4 space-y-2">
        <h3 className="text-xs font-medium uppercase tracking-wide text-text-secondary">Próximos atendimentos</h3>
        {appointments.length === 0 ? (
          <p className="text-sm text-text-secondary">Nenhum atendimento agendado para hoje.</p>
        ) : (
          <ul className="space-y-2">
            {appointments.map((appointment) => (
              <li
                key={appointment.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background-secondary px-3 py-2"
              >
                <div className="flex items-baseline gap-2">
                  <span className="font-mono text-sm font-semibold tabular-nums text-primary">
                    {formatInBarbershopTz(appointment.startTime, timezone, "HH:mm")}
                  </span>
                  <span className="text-sm text-text">{appointment.client.name}</span>
                  {showBarberName && (
                    <span className="text-xs text-text-secondary">· {appointment.barber.professionalName}</span>
                  )}
                </div>
                <AppointmentStatusBadge status={appointment.status} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
