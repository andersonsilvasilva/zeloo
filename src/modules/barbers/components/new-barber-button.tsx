"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BarberFormDialog } from "@/modules/barbers/components/barber-form-dialog";
import type { BarberFormOptions } from "@/modules/barbers/types/barber.types";

export function NewBarberButton({ options }: { options: BarberFormOptions }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" />
        Novo barbeiro
      </Button>
      <BarberFormDialog
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
