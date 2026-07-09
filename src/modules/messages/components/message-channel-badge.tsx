import { MessageCircle, Smartphone } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { MessageChannel } from "@/modules/messages/types/message.types";

const CHANNEL_CONFIG: Record<MessageChannel, { label: string; icon: typeof MessageCircle }> = {
  WHATSAPP: { label: "WhatsApp", icon: MessageCircle },
  SMS: { label: "SMS", icon: Smartphone },
};

export function MessageChannelBadge({ channel }: { channel: MessageChannel }) {
  const config = CHANNEL_CONFIG[channel];
  const Icon = config.icon;
  return (
    <Badge variant="neutral">
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
}
