"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import type { AuditLogItem } from "@/modules/audit/types/audit-log.types";

const ACTION_VARIANT: Record<string, "success" | "primary" | "danger"> = {
  CREATE: "success",
  UPDATE: "primary",
  DELETE: "danger",
};

const ACTION_LABEL: Record<string, string> = {
  CREATE: "Criação",
  UPDATE: "Alteração",
  DELETE: "Exclusão",
};

export function AuditLogList({ logs }: { logs: AuditLogItem[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (logs.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-text-secondary">
        Nenhum registro de auditoria encontrado para o filtro selecionado.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {logs.map((log) => {
        const isExpanded = expandedId === log.id;
        return (
          <div key={log.id} className="rounded-xl border border-border bg-card p-4">
            <button
              type="button"
              className="flex w-full flex-wrap items-center justify-between gap-2 text-left"
              onClick={() => setExpandedId(isExpanded ? null : log.id)}
            >
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={ACTION_VARIANT[log.action] ?? "neutral"}>
                  {ACTION_LABEL[log.action] ?? log.action}
                </Badge>
                <span className="text-sm font-medium text-text">{log.entity}</span>
                {log.entityId && (
                  <span className="text-xs text-text-secondary">#{log.entityId.slice(-8)}</span>
                )}
                <span className="text-sm text-text-secondary">
                  por {log.user?.name ?? "Sistema/desconhecido"}
                </span>
              </div>
              <span className="text-xs text-text-secondary">
                {format(log.createdAt, "dd/MM/yyyy HH:mm:ss")}
              </span>
            </button>

            {isExpanded && (
              <div className="mt-3 space-y-2 border-t border-border pt-3 text-xs">
                {log.ipAddress && (
                  <p className="text-text-secondary">IP: {log.ipAddress}</p>
                )}
                {log.oldValues != null && (
                  <div>
                    <p className="mb-1 font-medium text-text-secondary">Valores antigos</p>
                    <pre className="overflow-x-auto rounded-lg bg-background-secondary p-2 text-text-secondary">
                      {JSON.stringify(log.oldValues, null, 2)}
                    </pre>
                  </div>
                )}
                {log.newValues != null && (
                  <div>
                    <p className="mb-1 font-medium text-text-secondary">Valores novos</p>
                    <pre className="overflow-x-auto rounded-lg bg-background-secondary p-2 text-text-secondary">
                      {JSON.stringify(log.newValues, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
