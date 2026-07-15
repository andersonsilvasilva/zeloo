"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { accountEntryStatusValues } from "@/modules/accounts/schemas/account.schema";

const STATUS_LABELS: Record<(typeof accountEntryStatusValues)[number], string> = {
  PENDING: "Pendente",
  SETTLED: "Liquidada",
  CANCELLED: "Cancelada",
};

export function AccountEntryFilters({ status }: { status: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function updateParam(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set("status", value);
    else params.delete("status");
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="w-48 space-y-1 print:hidden">
      <Label htmlFor="filter-status">Status</Label>
      <Select id="filter-status" value={status} onChange={(e) => updateParam(e.target.value)}>
        <option value="">Todos</option>
        {accountEntryStatusValues.map((s) => (
          <option key={s} value={s}>
            {STATUS_LABELS[s]}
          </option>
        ))}
      </Select>
    </div>
  );
}
