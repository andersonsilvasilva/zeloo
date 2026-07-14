"use server";

import { requirePermission, requireUserId } from "@/lib/auth/rbac";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { mercadoPagoSettingsSchema, type MercadoPagoSettingsInput } from "@/modules/settings/schemas/settings.schema";
import { SettingsService } from "@/modules/settings/services/settings.service";

export async function updateMercadoPagoSettingsAction(rawInput: MercadoPagoSettingsInput) {
  await requireUserId();
  await requirePermission(PERMISSIONS.settings.update);

  const input = mercadoPagoSettingsSchema.parse(rawInput);

  const service = new SettingsService();
  const settings = await service.updateMercadoPagoSettings(input);

  return { success: true as const, settings };
}
