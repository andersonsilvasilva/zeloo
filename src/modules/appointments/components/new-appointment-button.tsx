"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AppointmentFormDialog } from "@/modules/appointments/components/appointment-form-dialog";
import type { AppointmentFormOptions } from "@/modules/appointments/types/appointment.types";

export function NewAppointmentButton({ options }: { options: AppointmentFormOptions }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" />
        Novo agendamento
      </Button>
      <AppointmentFormDialog
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
