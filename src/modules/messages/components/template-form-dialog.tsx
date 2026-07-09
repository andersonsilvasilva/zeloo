"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { TemplateForm } from "@/modules/messages/components/template-form";
import type { MessageTemplateItem } from "@/modules/messages/types/message.types";

export interface TemplateFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  templateId?: string;
  defaultValues?: MessageTemplateItem;
  onSuccess: () => void;
}

export function TemplateFormDialog({
  open,
  onOpenChange,
  mode,
  templateId,
  defaultValues,
  onSuccess,
}: TemplateFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Novo modelo de mensagem" : "Editar modelo"}</DialogTitle>
          <DialogDescription>
            {mode === "create" ? "Crie um modelo reutilizável de WhatsApp/SMS." : "Atualize o modelo."}
          </DialogDescription>
        </DialogHeader>

        <TemplateForm
          key={templateId ?? "new"}
          mode={mode}
          templateId={templateId}
          defaultValues={defaultValues}
          onSuccess={onSuccess}
        />
      </DialogContent>
    </Dialog>
  );
}
