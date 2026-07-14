import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { hasPermission } from "@/lib/auth/rbac";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { ComingSoon } from "@/components/shared/coming-soon";
import { listAuditLogsAction, listAuditLogEntitiesAction } from "@/modules/audit/actions/list-audit-logs.action";
import { AuditLogFilters } from "@/modules/audit/components/audit-log-filters";
import { AuditLogList } from "@/modules/audit/components/audit-log-list";

export default async function AuditLogsPage({
  searchParams,
}: {
  searchParams: { entity?: string; action?: string };
}) {
  const canView = await hasPermission(PERMISSIONS.audit.view);
  if (!canView) return <ComingSoon title="Logs de auditoria" />;

  const entity = searchParams.entity || "";
  const action = searchParams.action || "";

  const [logs, entities] = await Promise.all([
    listAuditLogsAction({ entity: entity || undefined, action: action || undefined }),
    listAuditLogEntitiesAction(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/configuracoes"
          className="mb-1 inline-flex items-center gap-1 text-sm text-text-secondary hover:text-text"
        >
          <ArrowLeft size={14} />
          Voltar às configurações
        </Link>
        <h1 className="text-2xl font-semibold text-text">Logs de auditoria</h1>
        <p className="text-sm text-text-secondary">
          Últimas 200 alterações registradas no sistema (criação, alteração e exclusão de dados).
        </p>
      </div>

      <AuditLogFilters entity={entity} action={action} entities={entities} />

      <AuditLogList logs={logs} />
    </div>
  );
}
