"use server";

import { revalidatePath } from "next/cache";
import { requirePermission, requireUserId } from "@/lib/auth/rbac";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { SettingsService } from "@/modules/settings/services/settings.service";

export async function removeLogoAction() {
  await requireUserId();
  await requirePermission(PERMISSIONS.settings.update);

  const service = new SettingsService();
  const settings = await service.removeLogo();
  revalidatePath("/", "layout");
  return { success: true as const, settings };
}
