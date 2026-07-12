"use server";

import { revalidatePath } from "next/cache";
import { requirePermission, requireUserId } from "@/lib/auth/rbac";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { createProfessionalSchema, type CreateProfessionalInput } from "@/modules/professionals/schemas/professional.schema";
import { ProfessionalService } from "@/modules/professionals/services/professional.service";

export async function createProfessionalAction(rawInput: CreateProfessionalInput) {
  await requireUserId();
  await requirePermission(PERMISSIONS.professionals.create);

  const input = createProfessionalSchema.parse(rawInput);

  const service = new ProfessionalService();
  const professional = await service.create(input);
  // Profissional aparece em /profissionais (painel) e em /agendar/escolher,
  // /agendar/profissional (vitrine pública) — invalida o layout raiz.
  revalidatePath("/", "layout");
  return { success: true as const, professional };
}
