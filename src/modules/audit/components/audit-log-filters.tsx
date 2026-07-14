"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

const ACTION_LABELS: Record<string, string> = {
  CREATE: "Criação",
  UPDATE: "Alteração",
  DELETE: "Exclusão",
};

export interface AuditLogFiltersProps {
  entity: string;
  action: string;
  entities: string[];
}

export function AuditLogFilters({ entity, action, entities }: AuditLogFiltersProps) {
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
        <Label htmlFor="filter-entity">Entidade</Label>
        <Select id="filter-entity" value={entity} onChange={(e) => updateParam("entity", e.target.value)}>
          <option value="">Todas</option>
          {entities.map((e) => (
            <option key={e} value={e}>
              {e}
            </option>
          ))}
        </Select>
      </div>

      <div className="w-44 space-y-1">
        <Label htmlFor="filter-action">Ação</Label>
        <Select id="filter-action" value={action} onChange={(e) => updateParam("action", e.target.value)}>
          <option value="">Todas</option>
          {Object.entries(ACTION_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
      </div>
    </div>
  );
}
