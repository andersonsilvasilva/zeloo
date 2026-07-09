"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { serviceStatusValues } from "@/modules/services/schemas/service.schema";

const STATUS_LABELS: Record<(typeof serviceStatusValues)[number], string> = {
  ACTIVE: "Ativo",
  INACTIVE: "Inativo",
};

export interface ServiceFiltersProps {
  search: string;
  status: string;
}

export function ServiceFilters({ search, status }: ServiceFiltersProps) {
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
          placeholder="Nome ou categoria"
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
          {serviceStatusValues.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </Select>
      </div>
    </div>
  );
}
