import type { Prisma } from "@prisma/client";
import { prisma, type PrismaOrTx } from "@/lib/prisma";

export class SettingsRepository {
  constructor(private readonly db: PrismaOrTx = prisma) {}

  async getMany(keys: string[]): Promise<Record<string, string>> {
    const rows = await this.db.setting.findMany({ where: { key: { in: keys } } });
    return Object.fromEntries(rows.map((row) => [row.key, row.value]));
  }

  async upsertMany(entries: { key: string; value: string }[]): Promise<void> {
    await Promise.all(
      entries.map((entry) =>
        this.db.setting.upsert({
          // `where: { key }` sozinho não corresponde mais a nenhum unique do
          // Prisma — `Setting.key` virou @@unique([tenantId, key]) (correção
          // pós-Fase 16, ver docs/tenancy/02-data-migration.md). O cast é
          // seguro aqui porque quem resolve o `where` de verdade, em
          // runtime, é a extensão de isolamento (tenant-extension.ts),
          // que reescreve isso pra `{ tenantId_key: { tenantId, key } }`
          // antes da query chegar no Prisma de fato — o tipo gerado não tem
          // como saber disso estaticamente.
          where: { key: entry.key } as Prisma.SettingWhereUniqueInput,
          update: { value: entry.value },
          create: { key: entry.key, value: entry.value, type: "string" },
        }),
      ),
    );
  }

  async findMediaById(id: string) {
    return this.db.media.findUnique({ where: { id } });
  }

  async createMedia(data: Prisma.MediaCreateInput) {
    return this.db.media.create({ data });
  }

  /** No-op se o id não existir — evita que o service precise capturar exceção. */
  async deleteMedia(id: string): Promise<void> {
    await this.db.media.deleteMany({ where: { id } });
  }
}
