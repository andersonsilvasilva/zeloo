"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { format, subDays, startOfMonth } from "date-fns";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export interface DateRangeFiltersProps {
  dateFrom: string;
  dateTo: string;
}

export function DateRangeFilters({ dateFrom, dateTo }: DateRangeFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function updateParams(next: { dateFrom: string; dateTo: string }) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("dateFrom", next.dateFrom);
    params.set("dateTo", next.dateTo);
    router.push(`${pathname}?${params.toString()}`);
  }

  function applyPreset(days: number) {
    const today = new Date();
    updateParams({ dateFrom: format(subDays(today, days - 1), "yyyy-MM-dd"), dateTo: format(today, "yyyy-MM-dd") });
  }

  function applyThisMonth() {
    const today = new Date();
    updateParams({ dateFrom: format(startOfMonth(today), "yyyy-MM-dd"), dateTo: format(today, "yyyy-MM-dd") });
  }

  return (
    <div className="flex flex-wrap items-end gap-3 print:hidden">
      <div className="space-y-1">
        <Label htmlFor="date-range-from">De</Label>
        <input
          id="date-range-from"
          type="date"
          value={dateFrom}
          onChange={(e) => updateParams({ dateFrom: e.target.value, dateTo })}
          className="h-10 rounded-lg border border-border bg-card px-3 text-sm text-text focus-gold"
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="date-range-to">Até</Label>
        <input
          id="date-range-to"
          type="date"
          value={dateTo}
          onChange={(e) => updateParams({ dateFrom, dateTo: e.target.value })}
          className="h-10 rounded-lg border border-border bg-card px-3 text-sm text-text focus-gold"
        />
      </div>
      <div className="flex gap-2">
        <Button type="button" variant="secondary" size="sm" onClick={() => applyPreset(7)}>
          7 dias
        </Button>
        <Button type="button" variant="secondary" size="sm" onClick={() => applyPreset(30)}>
          30 dias
        </Button>
        <Button type="button" variant="secondary" size="sm" onClick={applyThisMonth}>
          Este mês
        </Button>
      </div>
    </div>
  );
}
