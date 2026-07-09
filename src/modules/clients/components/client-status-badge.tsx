import { Badge } from "@/components/ui/badge";
import type { ClientStatus } from "@/modules/clients/types/client.types";

const STATUS_CONFIG: Record<ClientStatus, { label: string; variant: "neutral" | "primary" | "success" }> = {
  ACTIVE: { label: "Ativo", variant: "success" },
  INACTIVE: { label: "Inativo", variant: "neutral" },
  VIP: { label: "VIP", variant: "primary" },
};

export function ClientStatusBadge({ status }: { status: ClientStatus }) {
  const config = STATUS_CONFIG[status];
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
