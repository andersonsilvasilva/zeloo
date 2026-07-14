export interface AuditLogItem {
  id: string;
  action: string;
  entity: string;
  entityId: string | null;
  oldValues: unknown;
  newValues: unknown;
  ipAddress: string | null;
  createdAt: Date;
  user: { id: string; name: string } | null;
}

export interface ListAuditLogsFilters {
  entity?: string;
  action?: string;
  userId?: string;
}
