"use server";

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
  return { success: true as const, settings };
}
