"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/shared/confirm-dialog-provider";
import { TenantStatusBadge } from "@/modules/tenancy/components/tenant-status-badge";
import { updateTenantStatusAction } from "@/modules/tenancy/actions/update-tenant-status.action";
import type { TenantListItem } from "@/modules/tenancy/types/tenancy.types";

function formatDate(date: Date | null): string {
  if (!date) return "—";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(new Date(date));
}

export function TenantList({ tenants, baseDomain }: { tenants: TenantListItem[]; baseDomain: string }) {
  const router = useRouter();
  const confirm = useConfirm();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({});

  async function handleChangeStatus(tenant: TenantListItem, status: "ACTIVE" | "SUSPENDED") {
    const isSuspending = status === "SUSPENDED";
    const ok = await confirm({
      title: isSuspending ? "Suspender tenant" : "Reativar tenant",
      description: isSuspending
        ? `Suspender "${tenant.name}"? Ninguém consegue acessar o painel desse negócio (${tenant.slug}.${baseDomain}) enquanto estiver suspenso — os dados continuam intactos.`
        : `Reativar "${tenant.name}"? O acesso ao painel volta a funcionar normalmente.`,
      confirmLabel: isSuspending ? "Suspender" : "Reativar",
      variant: isSuspending ? "danger" : "default",
    });
    if (!ok) return;

    setBusyId(tenant.id);
    setRowErrors((prev) => ({ ...prev, [tenant.id]: "" }));
    const result = await updateTenantStatusAction({ id: tenant.id, status });
    setBusyId(null);

    if (!result.success) {
      setRowErrors((prev) => ({ ...prev, [tenant.id]: result.error }));
      return;
    }
    router.refresh();
  }

  if (tenants.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-text-secondary">
        Nenhum tenant cadastrado ainda.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {tenants.map((tenant) => (
        <div key={tenant.id} className="rounded-xl border border-border bg-card p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium text-text">{tenant.name}</span>
                <TenantStatusBadge status={tenant.status} />
                {tenant.isRoot && <span className="text-xs text-text-secondary">(tenant raiz)</span>}
              </div>
              <p className="text-sm text-text-secondary">
                {tenant.slug}.{baseDomain}
                {tenant.ownerName ? ` · dono: ${tenant.ownerName} (${tenant.ownerEmail})` : ""}
              </p>
              <p className="text-xs text-text-secondary">
                Criado em {formatDate(tenant.createdAt)}
                {tenant.status === "TRIAL" && tenant.trialEndsAt ? ` · trial até ${formatDate(tenant.trialEndsAt)}` : ""}
              </p>
              {rowErrors[tenant.id] && <p className="text-sm text-danger">{rowErrors[tenant.id]}</p>}
            </div>

            {!tenant.isRoot && (
              <div className="flex flex-wrap gap-2">
                {tenant.status !== "SUSPENDED" ? (
                  <Button
                    variant="danger"
                    size="sm"
                    disabled={busyId === tenant.id}
                    onClick={() => handleChangeStatus(tenant, "SUSPENDED")}
                  >
                    Suspender
                  </Button>
                ) : (
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={busyId === tenant.id}
                    onClick={() => handleChangeStatus(tenant, "ACTIVE")}
                  >
                    Reativar
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
