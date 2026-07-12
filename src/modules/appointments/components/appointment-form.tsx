"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { TimeSlotPicker } from "@/modules/appointments/components/time-slot-picker";
import { createAppointmentAction } from "@/modules/appointments/actions/create-appointment.action";
import { updateAppointmentAction } from "@/modules/appointments/actions/update-appointment.action";
import { getAvailableSlotsAction } from "@/modules/appointments/actions/get-available-slots.action";
import { createAppointmentSchema, rescheduleAppointmentSchema } from "@/modules/appointments/schemas/appointment.schema";
import { formatCurrency } from "@/lib/utils/format";
import { parseDateOnly, formatDateOnly } from "@/modules/appointments/utils/date-only";
import type { AppointmentFormOptions, TimeSlot } from "@/modules/appointments/types/appointment.types";

export interface AppointmentFormDefaultValues {
  clientId: string;
  professionalId: string;
  serviceIds: string[];
  appointmentDate: Date;
  startTime: Date;
  notes: string | null;
}

export interface AppointmentFormProps {
  options: AppointmentFormOptions;
  mode: "create" | "edit";
  appointmentId?: string;
  defaultValues?: AppointmentFormDefaultValues;
  onSuccess: () => void;
}

/**
 * Data local (não UTC) usada apenas para calcular horários — precisa refletir
 * o dia da semana e o "agora" reais do fuso do usuário. Para o campo
 * `appointmentDate` (persistido), use os helpers UTC-safe de date-only.ts.
 */
function parseLocalDateInput(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function formatLocalDateInput(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

export function AppointmentForm({ options, mode, appointmentId, defaultValues, onSuccess }: AppointmentFormProps) {
  const [clientId, setClientId] = useState(defaultValues?.clientId ?? "");
  const [serviceIds, setServiceIds] = useState<string[]>(defaultValues?.serviceIds ?? []);
  const [professionalId, setProfessionalId] = useState(defaultValues?.professionalId ?? "");
  const [dateStr, setDateStr] = useState(
    defaultValues ? formatDateOnly(defaultValues.appointmentDate) : "",
  );
  const [notes, setNotes] = useState(defaultValues?.notes ?? "");

  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(
    defaultValues ? { start: defaultValues.startTime, end: defaultValues.startTime, available: true } : null,
  );

  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const requestIdRef = useRef(0);

  const availableProfessionals = useMemo(
    () =>
      serviceIds.length === 0
        ? []
        : options.professionals.filter((b) => serviceIds.every((id) => b.serviceIds.includes(id))),
    [options.professionals, serviceIds],
  );

  const selectedServices = useMemo(
    () => options.services.filter((s) => serviceIds.includes(s.id)),
    [options.services, serviceIds],
  );
  const totalPrice = selectedServices.reduce((sum, s) => sum + s.price, 0);
  const totalDuration = selectedServices.reduce((sum, s) => sum + s.durationMinutes, 0);

  // Se o profissional selecionado não atende mais todos os serviços escolhidos, limpa a seleção.
  useEffect(() => {
    if (professionalId && !availableProfessionals.some((b) => b.id === professionalId)) {
      setProfessionalId("");
    }
  }, [availableProfessionals, professionalId]);

  useEffect(() => {
    if (!professionalId || !dateStr || serviceIds.length === 0) {
      setSlots([]);
      return;
    }

    const requestId = ++requestIdRef.current;
    setSlotsLoading(true);

    getAvailableSlotsAction({
      professionalId,
      serviceIds,
      date: parseLocalDateInput(dateStr),
      excludeAppointmentId: mode === "edit" ? appointmentId : undefined,
    })
      .then((result) => {
        if (requestIdRef.current !== requestId) return;
        setSlots(result);
        setSelectedSlot((current) =>
          current && result.some((s) => s.start.getTime() === current.start.getTime() && s.available)
            ? current
            : null,
        );
      })
      .finally(() => {
        if (requestIdRef.current === requestId) setSlotsLoading(false);
      });
  }, [professionalId, dateStr, serviceIds, mode, appointmentId]);

  function toggleService(serviceId: string) {
    setServiceIds((current) =>
      current.includes(serviceId) ? current.filter((id) => id !== serviceId) : [...current, serviceId],
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    if (!clientId) return setFormError("Selecione o cliente.");
    if (serviceIds.length === 0) return setFormError("Selecione ao menos um serviço.");
    if (!professionalId) return setFormError("Selecione o profissional.");
    if (!dateStr) return setFormError("Selecione a data.");
    if (!selectedSlot) return setFormError("Selecione um horário disponível.");

    const payload = {
      clientId,
      professionalId,
      appointmentDate: parseDateOnly(dateStr),
      startTime: selectedSlot.start,
      serviceIds,
      notes: notes.trim() || undefined,
    };

    setSubmitting(true);
    try {
      if (mode === "create") {
        const parsed = createAppointmentSchema.safeParse(payload);
        if (!parsed.success) {
          setFormError(parsed.error.issues[0]?.message ?? "Dados inválidos.");
          return;
        }
        const result = await createAppointmentAction(parsed.data);
        if (!result.success) return setFormError(result.error);
      } else {
        const parsed = rescheduleAppointmentSchema.safeParse({ ...payload, id: appointmentId });
        if (!parsed.success) {
          setFormError(parsed.error.issues[0]?.message ?? "Dados inválidos.");
          return;
        }
        const result = await updateAppointmentAction(parsed.data);
        if (!result.success) return setFormError(result.error);
      }
      onSuccess();
    } finally {
      setSubmitting(false);
    }
  }

  const today = formatLocalDateInput(new Date());

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-1">
        <Label htmlFor="clientId">Cliente</Label>
        <Select id="clientId" value={clientId} onChange={(e) => setClientId(e.target.value)}>
          <option value="">Selecione o cliente</option>
          {options.clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
              {c.phone ? ` — ${c.phone}` : ""}
            </option>
          ))}
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Serviços</Label>
        <div className="max-h-40 space-y-2 overflow-y-auto rounded-lg border border-border p-3">
          {options.services.map((service) => (
            <label key={service.id} className="flex cursor-pointer items-center justify-between gap-3 text-sm">
              <span className="flex items-center gap-2 text-text">
                <Checkbox
                  checked={serviceIds.includes(service.id)}
                  onCheckedChange={() => toggleService(service.id)}
                />
                {service.name}
              </span>
              <span className="whitespace-nowrap text-text-secondary">
                {formatCurrency(service.price)} · {service.durationMinutes}min
              </span>
            </label>
          ))}
        </div>
        {selectedServices.length > 0 && (
          <p className="text-xs text-text-secondary">
            Total: {formatCurrency(totalPrice)} · {totalDuration}min
          </p>
        )}
      </div>

      <div className="space-y-1">
        <Label htmlFor="professionalId">Profissional</Label>
        <Select
          id="professionalId"
          value={professionalId}
          onChange={(e) => setProfessionalId(e.target.value)}
          disabled={serviceIds.length === 0}
        >
          <option value="">
            {serviceIds.length === 0 ? "Selecione ao menos um serviço primeiro" : "Selecione o profissional"}
          </option>
          {availableProfessionals.map((b) => (
            <option key={b.id} value={b.id}>
              {b.professionalName}
            </option>
          ))}
        </Select>
      </div>

      <div className="space-y-1">
        <Label htmlFor="appointmentDate">Data</Label>
        <input
          id="appointmentDate"
          type="date"
          min={today}
          value={dateStr}
          onChange={(e) => setDateStr(e.target.value)}
          className="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm text-text focus-gold"
        />
      </div>

      <div className="space-y-2">
        <Label>Horário</Label>
        <TimeSlotPicker
          slots={slots}
          selected={selectedSlot?.start ?? null}
          onSelect={setSelectedSlot}
          loading={slotsLoading}
          timezone={options.timezone}
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor="notes">Observações</Label>
        <Textarea id="notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Opcional" />
      </div>

      {formError && <p className="text-sm text-danger">{formError}</p>}

      <Button type="submit" className="w-full" disabled={submitting}>
        {submitting ? "Salvando..." : mode === "create" ? "Criar agendamento" : "Salvar alterações"}
      </Button>
    </form>
  );
}
