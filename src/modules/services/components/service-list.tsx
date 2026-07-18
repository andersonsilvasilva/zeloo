"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/shared/confirm-dialog-provider";
import { formatCurrency } from "@/lib/utils/format";
import { ServiceStatusBadge } from "@/modules/services/components/service-status-badge";
import { ServiceFormDialog } from "@/modules/services/components/service-form-dialog";
import { deleteServiceAction } from "@/modules/services/actions/delete-service.action";
import type { ServiceDetail, ServiceFormOptions } from "@/modules/services/types/service.types";

export interface ServiceListProps {
  services: ServiceDetail[];
  options: ServiceFormOptions;
  canUpdate: boolean;
  canDelete: boolean;
}

export function ServiceList({ services, options, canUpdate, canDelete }: ServiceListProps) {
  const router = useRouter();
  const confirm = useConfirm();
  const [editing, setEditing] = useState<ServiceDetail | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({});

  async function handleDelete(service: ServiceDetail) {
    const ok = await confirm({
      title: "Excluir serviço",
      description: `Excluir o serviço "${service.name}"? Essa ação não pode ser desfeita.`,
      confirmLabel: "Excluir",
      variant: "danger",
    });
    if (!ok) return;

    setPendingId(service.id);
    const result = await deleteServiceAction({ id: service.id });
    setPendingId(null);

    if (!result.success) {
      setRowErrors((prev) => ({ ...prev, [service.id]: result.error }));
      return;
    }
    router.refresh();
  }

  if (services.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-text-secondary">
        Nenhum serviço encontrado para o filtro selecionado.
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {services.map((service) => (
          <div key={service.id} className="rounded-xl border border-border bg-card p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-border bg-background-secondary">
                  {service.photoUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={service.photoUrl} alt={service.name} className="h-full w-full object-cover" />
                  )}
                </div>
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-text">{service.name}</span>
                    <ServiceStatusBadge status={service.status} />
                  </div>
                  <p className="text-sm text-text-secondary">
                    {formatCurrency(service.price)} · {service.durationMinutes}min
                    {service.category ? ` · ${service.category}` : ""}
                  </p>
                  <p className="text-xs text-text-secondary">
                    {service.professionalsCount} profissional(s) oferecem este serviço
                    {service.defaultMessageTemplateName
                      ? ` · Mensagem padrão: ${service.defaultMessageTemplateName}`
                      : ""}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {canUpdate && (
                  <Button variant="secondary" size="sm" onClick={() => setEditing(service)}>
                    Editar
                  </Button>
                )}
                {canDelete && (
                  <Button
                    variant="danger"
                    size="sm"
                    disabled={pendingId === service.id}
                    onClick={() => handleDelete(service)}
                  >
                    Excluir
                  </Button>
                )}
              </div>
            </div>
            {rowErrors[service.id] && <p className="mt-2 text-sm text-danger">{rowErrors[service.id]}</p>}
          </div>
        ))}
      </div>

      {editing && (
        <ServiceFormDialog
          open={Boolean(editing)}
          onOpenChange={(open) => !open && setEditing(null)}
          options={options}
          mode="edit"
          serviceId={editing.id}
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
