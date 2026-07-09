"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ClientFormDialog } from "@/modules/clients/components/client-form-dialog";
import type { ClientFormOptions } from "@/modules/clients/types/client.types";

export function NewClientButton({ options }: { options: ClientFormOptions }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" />
        Novo cliente
      </Button>
      <ClientFormDialog
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
