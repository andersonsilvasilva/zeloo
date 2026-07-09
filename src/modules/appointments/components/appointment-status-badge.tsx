import { Badge } from "@/components/ui/badge";
import type { AppointmentStatus } from "@/modules/appointments/types/appointment.types";

const STATUS_CONFIG: Record<AppointmentStatus, { label: string; variant: "neutral" | "primary" | "success" | "danger" | "warning" }> = {
  PENDING: { label: "Pendente", variant: "warning" },
  CONFIRMED: { label: "Confirmado", variant: "primary" },
  IN_PROGRESS: { label: "Em atendimento", variant: "primary" },
  COMPLETED: { label: "Concluído", variant: "success" },
  CANCELLED: { label: "Cancelado", variant: "danger" },
  NO_SHOW: { label: "Não compareceu", variant: "neutral" },
};

export function AppointmentStatusBadge({ status }: { status: AppointmentStatus }) {
  const config = STATUS_CONFIG[status];
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
