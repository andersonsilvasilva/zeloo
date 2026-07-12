import { Badge } from "@/components/ui/badge";
import type { ProfessionalStatus } from "@/modules/professionals/types/professional.types";

const STATUS_CONFIG: Record<ProfessionalStatus, { label: string; variant: "neutral" | "success" | "warning" }> = {
  ACTIVE: { label: "Ativo", variant: "success" },
  INACTIVE: { label: "Inativo", variant: "neutral" },
  VACATION: { label: "Férias", variant: "warning" },
};

export function ProfessionalStatusBadge({ status }: { status: ProfessionalStatus }) {
  const config = STATUS_CONFIG[status];
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
