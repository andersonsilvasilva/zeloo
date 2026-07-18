import { Badge } from "@/components/ui/badge";
import type { TenantSummary } from "@/modules/tenancy/types/tenancy.types";

const STATUS_CONFIG: Record<TenantSummary["status"], { label: string; variant: "neutral" | "primary" | "success" | "danger" }> = {
  TRIAL: { label: "Trial", variant: "primary" },
  ACTIVE: { label: "Ativo", variant: "success" },
  SUSPENDED: { label: "Suspenso", variant: "danger" },
  CANCELLED: { label: "Cancelado", variant: "neutral" },
};

export function TenantStatusBadge({ status }: { status: TenantSummary["status"] }) {
  const config = STATUS_CONFIG[status];
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
