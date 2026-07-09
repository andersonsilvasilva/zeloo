"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { cashbookEntryTypeValues } from "@/modules/finance/schemas/finance.schema";

const TYPE_LABELS: Record<(typeof cashbookEntryTypeValues)[number], string> = {
  CREDIT: "Entrada",
  DEBIT: "Saída",
};

export interface CashbookFiltersProps {
  dateFrom: string;
  dateTo: string;
  type: string;
}

export function CashbookFilters({ dateFrom, dateTo, type }: CashbookFiltersProps) {
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
      <div className="space-y-1">
        <Label htmlFor="filter-date-from">De</Label>
        <input
          id="filter-date-from"
          type="date"
          value={dateFrom}
          onChange={(e) => updateParam("dateFrom", e.target.value)}
          className="h-10 rounded-lg border border-border bg-card px-3 text-sm text-text focus-gold"
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="filter-date-to">Até</Label>
        <input
          id="filter-date-to"
          type="date"
          value={dateTo}
          onChange={(e) => updateParam("dateTo", e.target.value)}
          className="h-10 rounded-lg border border-border bg-card px-3 text-sm text-text focus-gold"
        />
      </div>
      <div className="w-40 space-y-1">
        <Label htmlFor="filter-type">Tipo</Label>
        <Select id="filter-type" value={type} onChange={(e) => updateParam("type", e.target.value)}>
          <option value="">Todos</option>
          {cashbookEntryTypeValues.map((t) => (
            <option key={t} value={t}>
              {TYPE_LABELS[t]}
            </option>
          ))}
        </Select>
      </div>
    </div>
  );
}
