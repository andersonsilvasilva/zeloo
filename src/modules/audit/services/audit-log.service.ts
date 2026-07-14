import { AuditLogRepository } from "@/modules/audit/repositories/audit-log.repository";
import type { AuditLogItem, ListAuditLogsFilters } from "@/modules/audit/types/audit-log.types";

export class AuditLogService {
  async list(filters: ListAuditLogsFilters): Promise<AuditLogItem[]> {
    const repo = new AuditLogRepository();
    const rows = await repo.list(filters);
    return rows.map((row) => ({
      id: row.id,
      action: row.action,
      entity: row.entity,
      entityId: row.entityId,
      oldValues: row.oldValues,
      newValues: row.newValues,
      ipAddress: row.ipAddress,
      createdAt: row.createdAt,
      user: row.user,
    }));
  }

  async listDistinctEntities(): Promise<string[]> {
    const repo = new AuditLogRepository();
    return repo.listDistinctEntities();
  }
}
