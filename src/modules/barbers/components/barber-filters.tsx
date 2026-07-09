"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { barberStatusValues } from "@/modules/barbers/schemas/barber.schema";

const STATUS_LABELS: Record<(typeof barberStatusValues)[number], string> = {
  ACTIVE: "Ativo",
  INACTIVE: "Inativo",
  VACATION: "Férias",
};

export interface BarberFiltersProps {
  search: string;
  status: string;
}

export function BarberFilters({ search, status }: BarberFiltersProps) {
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
      <div className="w-64 space-y-1">
        <Label htmlFor="filter-search">Buscar</Label>
        <Input
          id="filter-search"
          placeholder="Nome ou telefone"
          defaultValue={search}
          onKeyDown={(e) => {
            if (e.key === "Enter") updateParam("search", e.currentTarget.value);
          }}
          onBlur={(e) => updateParam("search", e.currentTarget.value)}
        />
      </div>

      <div className="w-40 space-y-1">
        <Label htmlFor="filter-status">Status</Label>
        <Select id="filter-status" value={status} onChange={(e) => updateParam("status", e.target.value)}>
          <option value="">Todos</option>
          {barberStatusValues.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </Select>
      </div>
    </div>
  );
}
