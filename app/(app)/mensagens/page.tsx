import { hasPermission } from "@/lib/auth/rbac";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { ComingSoon } from "@/components/shared/coming-soon";
import { listTemplatesAction } from "@/modules/messages/actions/list-templates.action";
import { listMessageLogsAction } from "@/modules/messages/actions/list-message-logs.action";
import { getMessageFormOptionsAction } from "@/modules/messages/actions/get-message-form-options.action";
import { TemplateList } from "@/modules/messages/components/template-list";
import { NewTemplateButton } from "@/modules/messages/components/new-template-button";
import { SendMessageDialog } from "@/modules/messages/components/send-message-dialog";
import { MessageLogList } from "@/modules/messages/components/message-log-list";

export default async function MensagensPage() {
  const canSend = await hasPermission(PERMISSIONS.messages.send);
  if (!canSend) return <ComingSoon title="Mensagens" />;

  const [templates, logs, options] = await Promise.all([
    listTemplatesAction({}),
    listMessageLogsAction({}),
    getMessageFormOptionsAction(),
  ]);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-text">Mensagens</h1>
          <p className="text-sm text-text-secondary">Modelos de WhatsApp/SMS, envio e histórico.</p>
        </div>
        <SendMessageDialog options={options} />
      </div>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium uppercase tracking-wide text-text-secondary">Modelos</h2>
          <NewTemplateButton />
        </div>
        <TemplateList templates={templates} />
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium uppercase tracking-wide text-text-secondary">Histórico</h2>
        <MessageLogList logs={logs} />
      </section>
    </div>
  );
}
