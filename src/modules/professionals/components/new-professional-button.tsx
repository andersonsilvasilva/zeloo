"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProfessionalFormDialog } from "@/modules/professionals/components/professional-form-dialog";
import type { ProfessionalFormOptions } from "@/modules/professionals/types/professional.types";

export function NewProfessionalButton({ options }: { options: ProfessionalFormOptions }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" />
        Novo profissional
      </Button>
      <ProfessionalFormDialog
        open={open}
        onOpenChange={setOpen}
        options={options}
        mode="create"
        onSuccess={() => {
          setOpen(false);
          router.refresh();
        }}
      />
    </>
  );
}
