"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/shared/confirm-dialog-provider";
import { ProfessionalStatusBadge } from "@/modules/professionals/components/professional-status-badge";
import { ProfessionalFormDialog } from "@/modules/professionals/components/professional-form-dialog";
import { deleteProfessionalAction } from "@/modules/professionals/actions/delete-professional.action";
import type { ProfessionalDetail, ProfessionalFormOptions } from "@/modules/professionals/types/professional.types";

export interface ProfessionalListProps {
  professionals: ProfessionalDetail[];
  options: ProfessionalFormOptions;
  canUpdate: boolean;
  canDelete: boolean;
}

export function ProfessionalList({ professionals, options, canUpdate, canDelete }: ProfessionalListProps) {
  const router = useRouter();
  const confirm = useConfirm();
  const [editing, setEditing] = useState<ProfessionalDetail | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({});

  async function handleDelete(professional: ProfessionalDetail) {
    const ok = await confirm({
      title: "Excluir profissional",
      description: `Excluir o profissional "${professional.professionalName}"? Essa ação não pode ser desfeita.`,
      confirmLabel: "Excluir",
      variant: "danger",
    });
    if (!ok) return;

    setPendingId(professional.id);
    const result = await deleteProfessionalAction({ id: professional.id });
    setPendingId(null);

    if (!result.success) {
      setRowErrors((prev) => ({ ...prev, [professional.id]: result.error }));
      return;
    }
    router.refresh();
  }

  if (professionals.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-text-secondary">
        Nenhum profissional encontrado para o filtro selecionado.
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {professionals.map((professional) => (
          <div key={professional.id} className="rounded-xl border border-border bg-card p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full border border-border bg-background-secondary">
                  {professional.photoUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={professional.photoUrl} alt={professional.professionalName} className="h-full w-full object-cover" />
                  )}
                </div>
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-text">{professional.professionalName}</span>
                    <ProfessionalStatusBadge status={professional.status} />
                  </div>
                  <p className="text-sm text-text-secondary">
                    {[professional.phone, professional.whatsapp, professional.email].filter(Boolean).join(" · ") || "Sem contato"}
                  </p>
                  <p className="text-xs text-text-secondary">
                    Comissão: {professional.commissionPercentage}% · {professional.serviceIds.length} serviço(s)
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {canUpdate && (
                  <Button variant="secondary" size="sm" onClick={() => setEditing(professional)}>
                    Editar
                  </Button>
                )}
                {canDelete && (
                  <Button
                    variant="danger"
                    size="sm"
                    disabled={pendingId === professional.id}
                    onClick={() => handleDelete(professional)}
                  >
                    Excluir
                  </Button>
                )}
              </div>
            </div>
            {rowErrors[professional.id] && <p className="mt-2 text-sm text-danger">{rowErrors[professional.id]}</p>}
          </div>
        ))}
      </div>

      {editing && (
        <ProfessionalFormDialog
          open={Boolean(editing)}
          onOpenChange={(open) => !open && setEditing(null)}
          options={options}
          mode="edit"
          professionalId={editing.id}
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
