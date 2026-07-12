"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ImageUploader } from "@/components/shared/image-uploader";
import { ProfessionalForm } from "@/modules/professionals/components/professional-form";
import { updateProfessionalPhotoAction } from "@/modules/professionals/actions/update-professional-photo.action";
import { removeProfessionalPhotoAction } from "@/modules/professionals/actions/remove-professional-photo.action";
import type { ProfessionalDetail, ProfessionalFormOptions } from "@/modules/professionals/types/professional.types";

export interface ProfessionalFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  options: ProfessionalFormOptions;
  mode: "create" | "edit";
  professionalId?: string;
  defaultValues?: ProfessionalDetail;
  onSuccess: () => void;
}

export function ProfessionalFormDialog({
  open,
  onOpenChange,
  options,
  mode,
  professionalId,
  defaultValues,
  onSuccess,
}: ProfessionalFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Novo profissional" : "Editar profissional"}</DialogTitle>
          <DialogDescription>
            {mode === "create" ? "Cadastre um novo profissional." : "Atualize os dados do profissional."}
          </DialogDescription>
        </DialogHeader>

        {mode === "edit" && professionalId && (
          <div className="mb-4">
            <ImageUploader
              initialUrl={defaultValues?.photoUrl ?? null}
              alt={defaultValues?.professionalName ?? "Profissional"}
              shape="circle"
              onUpload={(formData) => {
                formData.set("id", professionalId);
                return updateProfessionalPhotoAction(formData);
              }}
              onRemove={() => removeProfessionalPhotoAction({ id: professionalId })}
            />
          </div>
        )}

        <ProfessionalForm
          key={professionalId ?? "new"}
          options={options}
          mode={mode}
          professionalId={professionalId}
          defaultValues={defaultValues}
          onSuccess={onSuccess}
        />
      </DialogContent>
    </Dialog>
  );
}
