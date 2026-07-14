import { formatInBarbershopTz } from "@/lib/utils/timezone";
import { MessageChannelBadge } from "@/modules/messages/components/message-channel-badge";
import { MessageStatusBadge } from "@/modules/messages/components/message-status-badge";
import type { MessageLogItem } from "@/modules/messages/types/message.types";

export function MessageLogList({ logs, timezone }: { logs: MessageLogItem[]; timezone: string }) {
  if (logs.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 text-center text-sm text-text-secondary">
        Nenhuma mensagem enviada ainda.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {logs.map((log) => (
        <div key={log.id} className="rounded-xl border border-border bg-card p-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-text">{log.client.name}</span>
            <MessageChannelBadge channel={log.channel} />
            <MessageStatusBadge status={log.status} />
            <span className="text-xs text-text-secondary">{formatInBarbershopTz(log.createdAt, timezone, "dd/MM/yyyy HH:mm")}</span>
          </div>
          <p className="mt-1 whitespace-pre-wrap text-sm text-text-secondary">{log.content}</p>
          <p className="mt-1 text-xs text-text-secondary">
            {log.template ? `Modelo: ${log.template.name}` : "Mensagem avulsa"}
            {log.sentBy ? ` · Enviado por ${log.sentBy.name}` : ""}
          </p>
        </div>
      ))}
    </div>
  );
}
