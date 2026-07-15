"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils/format";
import { toggleRecurringAccountEntryAction } from "@/modules/accounts/actions/toggle-recurring-account-entry.action";
import type { AccountDirection } from "@/modules/accounts/schemas/account.schema";
import type { RecurringAccountEntryItem } from "@/modules/accounts/types/account.types";

export interface RecurringAccountEntryListProps {
  direction: AccountDirection;
  entries: RecurringAccountEntryItem[];
  canUpdate: boolean;
}

export function RecurringAccountEntryList({ direction, entries, canUpdate }: RecurringAccountEntryListProps) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);

  if (entries.length === 0) return null;

  async function handleToggle(id: string, active: boolean) {
    setBusyId(id);
    await toggleRecurringAccountEntryAction({ id, direction, active: !active });
    setBusyId(null);
    router.refresh();
  }

  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <h2 className="mb-3 text-sm font-medium text-text">Contas recorrentes</h2>
      <div className="space-y-2">
        {entries.map((entry) => (
          <div key={entry.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-border py-2 last:border-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={entry.active ? "success" : "neutral"}>{entry.active ? "Ativa" : "Pausada"}</Badge>
              <span className="text-sm text-text">{entry.description}</span>
              <span className="text-xs text-text-secondary">todo dia {entry.dayOfMonth}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-text">{formatCurrency(entry.amount)}</span>
              {canUpdate && (
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={busyId === entry.id}
                  onClick={() => handleToggle(entry.id, entry.active)}
                >
                  {entry.active ? "Pausar" : "Reativar"}
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
