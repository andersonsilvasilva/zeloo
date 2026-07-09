import "server-only";
import { prisma } from "@/lib/prisma";

export function findActiveUserByEmail(email: string) {
  return prisma.user.findUnique({ where: { email } });
}
