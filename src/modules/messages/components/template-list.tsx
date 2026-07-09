"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MessageChannelBadge } from "@/modules/messages/components/message-channel-badge";
import { TemplateFormDialog } from "@/modules/messages/components/template-form-dialog";
import { deleteTemplateAction } from "@/modules/messages/actions/delete-template.action";
import type { MessageTemplateItem } from "@/modules/messages/types/message.types";

export function TemplateList({ templates }: { templates: MessageTemplateItem[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<MessageTemplateItem | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({});

  async function handleDelete(template: MessageTemplateItem) {
    if (!confirm(`Excluir o modelo "${template.name}"?`)) return;

    setPendingId(template.id);
    const result = await deleteTemplateAction({ id: template.id });
    setPendingId(null);

    if (!result.success) {
      setRowErrors((prev) => ({ ...prev, [template.id]: result.error }));
      return;
    }
    router.refresh();
  }

  if (templates.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 text-center text-sm text-text-secondary">
        Nenhum modelo cadastrado ainda.
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {templates.map((template) => (
          <div key={template.id} className="rounded-xl border border-border bg-card p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-text">{template.name}</span>
                  <MessageChannelBadge channel={template.channel} />
                  <Badge variant={template.status === "ACTIVE" ? "success" : "neutral"}>
                    {template.status === "ACTIVE" ? "Ativo" : "Inativo"}
                  </Badge>
                </div>
                <p className="max-w-xl whitespace-pre-wrap text-sm text-text-secondary">{template.content}</p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" size="sm" onClick={() => setEditing(template)}>
                  Editar
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  disabled={pendingId === template.id}
                  onClick={() => handleDelete(template)}
                >
                  Excluir
                </Button>
              </div>
            </div>
            {rowErrors[template.id] && <p className="mt-2 text-sm text-danger">{rowErrors[template.id]}</p>}
          </div>
        ))}
      </div>

      {editing && (
        <TemplateFormDialog
          open={Boolean(editing)}
          onOpenChange={(open) => !open && setEditing(null)}
          mode="edit"
          templateId={editing.id}
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
