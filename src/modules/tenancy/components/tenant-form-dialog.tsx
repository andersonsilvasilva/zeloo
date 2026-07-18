"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { TenantForm } from "@/modules/tenancy/components/tenant-form";

export interface TenantFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  baseDomain: string;
  onSuccess: (result: { slug: string; url: string }) => void;
}

export function TenantFormDialog({ open, onOpenChange, baseDomain, onSuccess }: TenantFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo tenant</DialogTitle>
          <DialogDescription>Cadastra um negócio novo na plataforma, com o proprietário já vinculado.</DialogDescription>
        </DialogHeader>
        <TenantForm baseDomain={baseDomain} onSuccess={onSuccess} />
      </DialogContent>
    </Dialog>
  );
}
