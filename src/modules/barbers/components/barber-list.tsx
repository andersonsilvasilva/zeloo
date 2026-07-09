"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { BarberStatusBadge } from "@/modules/barbers/components/barber-status-badge";
import { BarberFormDialog } from "@/modules/barbers/components/barber-form-dialog";
import { deleteBarberAction } from "@/modules/barbers/actions/delete-barber.action";
import type { BarberDetail, BarberFormOptions } from "@/modules/barbers/types/barber.types";

export interface BarberListProps {
  barbers: BarberDetail[];
  options: BarberFormOptions;
  canUpdate: boolean;
  canDelete: boolean;
}

export function BarberList({ barbers, options, canUpdate, canDelete }: BarberListProps) {
  const router = useRouter();
  const [editing, setEditing] = useState<BarberDetail | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({});

  async function handleDelete(barber: BarberDetail) {
    if (!confirm(`Excluir o barbeiro "${barber.professionalName}"?`)) return;

    setPendingId(barber.id);
    const result = await deleteBarberAction({ id: barber.id });
    setPendingId(null);

    if (!result.success) {
      setRowErrors((prev) => ({ ...prev, [barber.id]: result.error }));
      return;
    }
    router.refresh();
  }

  if (barbers.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-text-secondary">
        Nenhum barbeiro encontrado para o filtro selecionado.
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {barbers.map((barber) => (
          <div key={barber.id} className="rounded-xl border border-border bg-card p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full border border-border bg-background-secondary">
                  {barber.photoUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={barber.photoUrl} alt={barber.professionalName} className="h-full w-full object-cover" />
                  )}
                </div>
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-text">{barber.professionalName}</span>
                    <BarberStatusBadge status={barber.status} />
                  </div>
                  <p className="text-sm text-text-secondary">
                    {[barber.phone, barber.whatsapp, barber.email].filter(Boolean).join(" · ") || "Sem contato"}
                  </p>
                  <p className="text-xs text-text-secondary">
                    Comissão: {barber.commissionPercentage}% · {barber.serviceIds.length} serviço(s)
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {canUpdate && (
                  <Button variant="secondary" size="sm" onClick={() => setEditing(barber)}>
                    Editar
                  </Button>
                )}
                {canDelete && (
                  <Button
                    variant="danger"
                    size="sm"
                    disabled={pendingId === barber.id}
                    onClick={() => handleDelete(barber)}
                  >
                    Excluir
                  </Button>
                )}
              </div>
            </div>
            {rowErrors[barber.id] && <p className="mt-2 text-sm text-danger">{rowErrors[barber.id]}</p>}
          </div>
        ))}
      </div>

      {editing && (
        <BarberFormDialog
          open={Boolean(editing)}
          onOpenChange={(open) => !open && setEditing(null)}
          options={options}
          mode="edit"
          barberId={editing.id}
          defaultValues={editing}
          onSuccess={() => {
            setEditing(null);
            router.refresh();
          }}
        />
      )}
    </>
  );
}
