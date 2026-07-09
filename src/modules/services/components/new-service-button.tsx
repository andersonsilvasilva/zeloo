"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ServiceFormDialog } from "@/modules/services/components/service-form-dialog";
import type { ServiceFormOptions } from "@/modules/services/types/service.types";

export function NewServiceButton({ options }: { options: ServiceFormOptions }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" />
        Novo serviço
      </Button>
      <ServiceFormDialog
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
