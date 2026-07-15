"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Label } from "@/components/ui/label";

export function MonthFilter({ month }: { month: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function updateMonth(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("month", value);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="space-y-1 print:hidden">
      <Label htmlFor="month-filter">Mês</Label>
      <input
        id="month-filter"
        type="month"
        value={month}
        onChange={(e) => updateMonth(e.target.value)}
        className="h-10 rounded-lg border border-border bg-card px-3 text-sm text-text focus-gold"
      />
    </div>
  );
}
