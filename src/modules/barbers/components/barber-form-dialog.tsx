"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ImageUploader } from "@/components/shared/image-uploader";
import { BarberForm } from "@/modules/barbers/components/barber-form";
import { updateBarberPhotoAction } from "@/modules/barbers/actions/update-barber-photo.action";
import { removeBarberPhotoAction } from "@/modules/barbers/actions/remove-barber-photo.action";
import type { BarberDetail, BarberFormOptions } from "@/modules/barbers/types/barber.types";

export interface BarberFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  options: BarberFormOptions;
  mode: "create" | "edit";
  barberId?: string;
  defaultValues?: BarberDetail;
  onSuccess: () => void;
}

export function BarberFormDialog({
  open,
  onOpenChange,
  options,
  mode,
  barberId,
  defaultValues,
  onSuccess,
}: BarberFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Novo barbeiro" : "Editar barbeiro"}</DialogTitle>
          <DialogDescription>
            {mode === "create" ? "Cadastre um novo barbeiro." : "Atualize os dados do barbeiro."}
          </DialogDescription>
        </DialogHeader>

        {mode === "edit" && barberId && (
          <div className="mb-4">
            <ImageUploader
              initialUrl={defaultValues?.photoUrl ?? null}
              alt={defaultValues?.professionalName ?? "Barbeiro"}
              shape="circle"
              onUpload={(formData) => {
                formData.set("id", barberId);
                return updateBarberPhotoAction(formData);
              }}
              onRemove={() => removeBarberPhotoAction({ id: barberId })}
            />
          </div>
        )}

        <BarberForm
          key={barberId ?? "new"}
          options={options}
          mode={mode}
          barberId={barberId}
          defaultValues={defaultValues}
          onSuccess={onSuccess}
        />
      </DialogContent>
    </Dialog>
  );
}
