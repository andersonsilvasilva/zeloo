"use server";

import { requirePermission, requireUserId } from "@/lib/auth/rbac";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { SettingsService } from "@/modules/settings/services/settings.service";

/** Só valores mascarados — nunca o segredo puro (ver SettingsService.getMercadoPagoSettings). */
export async function getMercadoPagoSettingsAction() {
  await requireUserId();
  await requirePermission(PERMISSIONS.settings.update);

  const service = new SettingsService();
  return service.getMercadoPagoSettings();
}
