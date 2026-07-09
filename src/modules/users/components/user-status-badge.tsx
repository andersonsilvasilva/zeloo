import { Badge } from "@/components/ui/badge";
import type { UserStatus } from "@/modules/users/types/user.types";

const STATUS_CONFIG: Record<UserStatus, { label: string; variant: "success" | "neutral" | "danger" }> = {
  ACTIVE: { label: "Ativo", variant: "success" },
  INACTIVE: { label: "Inativo", variant: "neutral" },
  SUSPENDED: { label: "Suspenso", variant: "danger" },
};

export function UserStatusBadge({ status }: { status: UserStatus }) {
  const config = STATUS_CONFIG[status];
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
