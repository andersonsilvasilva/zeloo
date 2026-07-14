import { prisma, type PrismaOrTx } from "@/lib/prisma";
import type { ListAuditLogsFilters } from "@/modules/audit/types/audit-log.types";

const auditLogInclude = {
  user: { select: { id: true, name: true } },
} satisfies import("@prisma/client").Prisma.AuditLogInclude;

const MAX_ROWS = 200;

export class AuditLogRepository {
  constructor(private readonly db: PrismaOrTx = prisma) {}

  async list(filters: ListAuditLogsFilters) {
    return this.db.auditLog.findMany({
      where: {
        entity: filters.entity || undefined,
        action: filters.action || undefined,
        userId: filters.userId || undefined,
      },
      include: auditLogInclude,
      orderBy: { createdAt: "desc" },
      take: MAX_ROWS,
    });
  }

  async listDistinctEntities(): Promise<string[]> {
    const rows = await this.db.auditLog.findMany({
      distinct: ["entity"],
      select: { entity: true },
      orderBy: { entity: "asc" },
    });
    return rows.map((r) => r.entity);
  }
}
