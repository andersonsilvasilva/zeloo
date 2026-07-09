"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ImageUploader } from "@/components/shared/image-uploader";
import { ServiceForm } from "@/modules/services/components/service-form";
import { updateServicePhotoAction } from "@/modules/services/actions/update-service-photo.action";
import { removeServicePhotoAction } from "@/modules/services/actions/remove-service-photo.action";
import type { ServiceDetail, ServiceFormOptions } from "@/modules/services/types/service.types";

export interface ServiceFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  options: ServiceFormOptions;
  mode: "create" | "edit";
  serviceId?: string;
  defaultValues?: ServiceDetail;
  onSuccess: () => void;
}

export function ServiceFormDialog({
  open,
  onOpenChange,
  options,
  mode,
  serviceId,
  defaultValues,
  onSuccess,
}: ServiceFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Novo serviço" : "Editar serviço"}</DialogTitle>
          <DialogDescription>
            {mode === "create" ? "Cadastre um novo serviço." : "Atualize os dados do serviço."}
          </DialogDescription>
        </DialogHeader>

        {mode === "edit" && serviceId && (
          <div className="mb-4">
            <ImageUploader
              initialUrl={defaultValues?.photoUrl ?? null}
              alt={defaultValues?.name ?? "Serviço"}
              emptyLabel="Sem imagem"
              onUpload={(formData) => {
                formData.set("id", serviceId);
                return updateServicePhotoAction(formData);
              }}
              onRemove={() => removeServicePhotoAction({ id: serviceId })}
            />
          </div>
        )}

        <ServiceForm
          key={serviceId ?? "new"}
          options={options}
          mode={mode}
          serviceId={serviceId}
          defaultValues={defaultValues}
          onSuccess={onSuccess}
        />
      </DialogContent>
    </Dialog>
  );
}
