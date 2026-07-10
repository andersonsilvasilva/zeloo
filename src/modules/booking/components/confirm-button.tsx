"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createPublicAppointmentAction } from "@/modules/booking/actions/create-public-appointment.action";
import type { CreatePublicAppointmentInput } from "@/modules/booking/schemas/booking.schema";

export function ConfirmButton({ input }: { input: CreatePublicAppointmentInput }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleConfirm() {
    setPending(true);
    setError(null);
    const result = await createPublicAppointmentAction(input);
    setPending(false);

    if (!result.success) {
      setError(result.error);
      return;
    }
    router.push(`/agendar/sucesso?appointmentId=${result.appointmentId}`);
  }

  return (
    <div>
      {error && <p className="mb-3 text-sm text-danger">{error}</p>}
      <Button
        type="button"
        className="w-full bg-booking-primary text-booking-bg hover:bg-booking-primary-light"
        disabled={pending}
        onClick={handleConfirm}
      >
        {pending ? "Confirmando..." : "Confirmar agendamento"}
      </Button>
    </div>
  );
}
