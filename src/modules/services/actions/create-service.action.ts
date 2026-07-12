"use server";

import { revalidatePath } from "next/cache";
import { requirePermission, requireUserId } from "@/lib/auth/rbac";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { createServiceSchema, type CreateServiceInput } from "@/modules/services/schemas/service.schema";
import { ServiceService } from "@/modules/services/services/service.service";

export async function createServiceAction(rawInput: CreateServiceInput) {
  await requireUserId();
  await requirePermission(PERMISSIONS.services.create);

  const input = createServiceSchema.parse(rawInput);

  const service = new ServiceService();
  const created = await service.create(input);
  // Serviço aparece em /servicos (painel) e em /agendar/profissional (vitrine pública).
  revalidatePath("/", "layout");
  return { success: true as const, service: created };
}
