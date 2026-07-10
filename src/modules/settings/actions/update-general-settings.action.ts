"use server";

import { revalidatePath } from "next/cache";
import { requirePermission, requireUserId } from "@/lib/auth/rbac";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { generalSettingsSchema, type GeneralSettingsInput } from "@/modules/settings/schemas/settings.schema";
import { SettingsService } from "@/modules/settings/services/settings.service";

export async function updateGeneralSettingsAction(rawInput: GeneralSettingsInput) {
  await requireUserId();
  await requirePermission(PERMISSIONS.settings.update);

  const input = generalSettingsSchema.parse(rawInput);

  const service = new SettingsService();
  const settings = await service.updateGeneralSettings(input);

  // Logo/nome aparecem no shell do painel inteiro, no login e em todo o
  // /agendar — invalida o layout raiz (cobre a aplicação toda) em vez de
  // listar rota por rota (mesma causa do dashboard desatualizado antes).
  revalidatePath("/", "layout");

  return { success: true as const, settings };
}
