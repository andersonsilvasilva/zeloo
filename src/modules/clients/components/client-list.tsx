"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils/format";
import { ClientStatusBadge } from "@/modules/clients/components/client-status-badge";
import { ClientFormDialog } from "@/modules/clients/components/client-form-dialog";
import { deleteClientAction } from "@/modules/clients/actions/delete-client.action";
import type { ClientDetail, ClientFormOptions } from "@/modules/clients/types/client.types";

export interface ClientListProps {
  clients: ClientDetail[];
  options: ClientFormOptions;
  canUpdate: boolean;
  canDelete: boolean;
}

export function ClientList({ clients, options, canUpdate, canDelete }: ClientListProps) {
  const router = useRouter();
  const [editing, setEditing] = useState<ClientDetail | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({});

  async function handleDelete(client: ClientDetail) {
    if (!confirm(`Excluir o cliente "${client.name}"?`)) return;

    setPendingId(client.id);
    const result = await deleteClientAction({ id: client.id });
    setPendingId(null);

    if (!result.success) {
      setRowErrors((prev) => ({ ...prev, [client.id]: result.error }));
      return;
    }
    router.refresh();
  }

  if (clients.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-text-secondary">
        Nenhum cliente encontrado para o filtro selecionado.
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {clients.map((client) => (
          <div key={client.id} className="rounded-xl border border-border bg-card p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full border border-border bg-background-secondary">
                  {client.photoUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={client.photoUrl} alt={client.name} className="h-full w-full object-cover" />
                  )}
                </div>
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-text">{client.name}</span>
                    <ClientStatusBadge status={client.status} />
                  </div>
                  <p className="text-sm text-text-secondary">
                    {[client.phone, client.whatsapp, client.email].filter(Boolean).join(" · ") || "Sem contato"}
                  </p>
                  <p className="text-xs text-text-secondary">
                    {client.preferredProfessional ? `Prefere ${client.preferredProfessional.professionalName} · ` : ""}
                    Total gasto: {formatCurrency(client.totalSpent)}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {canUpdate && (
                  <Button variant="secondary" size="sm" onClick={() => setEditing(client)}>
                    Editar
                  </Button>
                )}
                {canDelete && (
                  <Button
                    variant="danger"
                    size="sm"
                    disabled={pendingId === client.id}
                    onClick={() => handleDelete(client)}
                  >
                    Excluir
                  </Button>
                )}
              </div>
            </div>
            {rowErrors[client.id] && <p className="mt-2 text-sm text-danger">{rowErrors[client.id]}</p>}
          </div>
        ))}
      </div>

      {editing && (
        <ClientFormDialog
          open={Boolean(editing)}
          onOpenChange={(open) => !open && setEditing(null)}
          options={options}
          mode="edit"
          clientId={editing.id}
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
