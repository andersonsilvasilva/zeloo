"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TemplateFormDialog } from "@/modules/messages/components/template-form-dialog";

export function NewTemplateButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" />
        Novo modelo
      </Button>
      <TemplateFormDialog
        open={open}
        onOpenChange={setOpen}
        mode="create"
        onSuccess={() => {
          setOpen(false);
          router.refresh();
        }}
      />
    </>
  );
}
