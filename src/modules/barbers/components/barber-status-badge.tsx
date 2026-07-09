import { Badge } from "@/components/ui/badge";
import type { BarberStatus } from "@/modules/barbers/types/barber.types";

const STATUS_CONFIG: Record<BarberStatus, { label: string; variant: "neutral" | "success" | "warning" }> = {
  ACTIVE: { label: "Ativo", variant: "success" },
  INACTIVE: { label: "Inativo", variant: "neutral" },
  VACATION: { label: "Férias", variant: "warning" },
};

export function BarberStatusBadge({ status }: { status: BarberStatus }) {
  const config = STATUS_CONFIG[status];
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
