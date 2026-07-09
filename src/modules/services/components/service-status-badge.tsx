import { Badge } from "@/components/ui/badge";
import type { ServiceStatus } from "@/modules/services/types/service.types";

export function ServiceStatusBadge({ status }: { status: ServiceStatus }) {
  return <Badge variant={status === "ACTIVE" ? "success" : "neutral"}>{status === "ACTIVE" ? "Ativo" : "Inativo"}</Badge>;
}
