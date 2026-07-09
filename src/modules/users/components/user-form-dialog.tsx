"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { UserForm } from "@/modules/users/components/user-form";
import type { UserFormOptions, UserListItem } from "@/modules/users/types/user.types";

export interface UserFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  options: UserFormOptions;
  mode: "create" | "edit";
  userId?: string;
  defaultValues?: UserListItem;
  currentUserId: string;
  onSuccess: () => void;
}

export function UserFormDialog({
  open,
  onOpenChange,
  options,
  mode,
  userId,
  defaultValues,
  currentUserId,
  onSuccess,
}: UserFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Novo usuário" : "Editar usuário"}</DialogTitle>
          <DialogDescription>
            {mode === "create" ? "Cadastre um novo usuário do sistema." : "Atualize os dados do usuário."}
          </DialogDescription>
        </DialogHeader>

        <UserForm
          key={userId ?? "new"}
          options={options}
          mode={mode}
          userId={userId}
          defaultValues={defaultValues}
          currentUserId={currentUserId}
          onSuccess={onSuccess}
        />
      </DialogContent>
    </Dialog>
  );
}
