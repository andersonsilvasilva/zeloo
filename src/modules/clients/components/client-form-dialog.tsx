"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ImageUploader } from "@/components/shared/image-uploader";
import { ClientForm } from "@/modules/clients/components/client-form";
import { updateClientPhotoAction } from "@/modules/clients/actions/update-client-photo.action";
import { removeClientPhotoAction } from "@/modules/clients/actions/remove-client-photo.action";
import type { ClientDetail, ClientFormOptions } from "@/modules/clients/types/client.types";

export interface ClientFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  options: ClientFormOptions;
  mode: "create" | "edit";
  clientId?: string;
  defaultValues?: ClientDetail;
  onSuccess: () => void;
}

export function ClientFormDialog({
  open,
  onOpenChange,
  options,
  mode,
  clientId,
  defaultValues,
  onSuccess,
}: ClientFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Novo cliente" : "Editar cliente"}</DialogTitle>
          <DialogDescription>
            {mode === "create" ? "Cadastre um novo cliente." : "Atualize os dados do cliente."}
          </DialogDescription>
        </DialogHeader>

        {mode === "edit" && clientId && (
          <div className="mb-4">
            <ImageUploader
              initialUrl={defaultValues?.photoUrl ?? null}
              alt={defaultValues?.name ?? "Cliente"}
              shape="circle"
              onUpload={(formData) => {
                formData.set("id", clientId);
                return updateClientPhotoAction(formData);
              }}
              onRemove={() => removeClientPhotoAction({ id: clientId })}
            />
          </div>
        )}

        <ClientForm
          key={clientId ?? "new"}
          options={options}
          mode={mode}
          clientId={clientId}
          defaultValues={defaultValues}
          onSuccess={onSuccess}
        />
      </DialogContent>
    </Dialog>
  );
}
