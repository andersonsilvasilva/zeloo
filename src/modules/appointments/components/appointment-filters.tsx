"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { appointmentStatusValues } from "@/modules/appointments/schemas/appointment.schema";
import type { ProfessionalOption } from "@/modules/appointments/types/appointment.types";

const STATUS_LABELS: Record<(typeof appointmentStatusValues)[number], string> = {
  PENDING: "Pendente",
  CONFIRMED: "Confirmado",
  IN_PROGRESS: "Em atendimento",
  COMPLETED: "Concluído",
  CANCELLED: "Cancelado",
  NO_SHOW: "Não compareceu",
};

export interface AppointmentFiltersProps {
  professionalId: string;
  status: string;
  professionals: ProfessionalOption[];
}

export function AppointmentFilters({ professionalId, status, professionals }: AppointmentFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="w-48 space-y-1">
        <Label htmlFor="filter-professional">Profissional</Label>
        <Select id="filter-professional" value={professionalId} onChange={(e) => updateParam("professionalId", e.target.value)}>
          <option value="">Todos os profissionais</option>
          {professionals.map((b) => (
            <option key={b.id} value={b.id}>
              {b.professionalName}
            </option>
          ))}
        </Select>
      </div>

      <div className="w-44 space-y-1">
        <Label htmlFor="filter-status">Status</Label>
        <Select id="filter-status" value={status} onChange={(e) => updateParam("status", e.target.value)}>
          <option value="">Todos os status</option>
          {appointmentStatusValues.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </Select>
      </div>
    </div>
  );
}
