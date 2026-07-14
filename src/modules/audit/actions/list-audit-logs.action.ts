"use server";

import { requirePermission, requireUserId } from "@/lib/auth/rbac";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { AuditLogService } from "@/modules/audit/services/audit-log.service";
import type { ListAuditLogsFilters } from "@/modules/audit/types/audit-log.types";

export async function listAuditLogsAction(filters: ListAuditLogsFilters) {
  await requireUserId();
  await requirePermission(PERMISSIONS.audit.view);

  const service = new AuditLogService();
  return service.list(filters);
}

export async function listAuditLogEntitiesAction() {
  await requireUserId();
  await requirePermission(PERMISSIONS.audit.view);

  const service = new AuditLogService();
  return service.listDistinctEntities();
}
