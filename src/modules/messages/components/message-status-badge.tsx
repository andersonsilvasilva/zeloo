import { Badge } from "@/components/ui/badge";
import type { MessageStatus } from "@/modules/messages/types/message.types";

const STATUS_CONFIG: Record<MessageStatus, { label: string; variant: "neutral" | "primary" | "success" | "danger" }> = {
  QUEUED: { label: "Na fila", variant: "neutral" },
  SENT: { label: "Enviada", variant: "primary" },
  DELIVERED: { label: "Entregue", variant: "success" },
  FAILED: { label: "Falhou", variant: "danger" },
};

export function MessageStatusBadge({ status }: { status: MessageStatus }) {
  const config = STATUS_CONFIG[status];
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
