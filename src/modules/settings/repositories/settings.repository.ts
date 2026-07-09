import type { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type PrismaOrTx = PrismaClient | Prisma.TransactionClient;

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
          where: { key: entry.key },
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
