"use server";

import { revalidatePath } from "next/cache";
import { requirePermission, requireUserId } from "@/lib/auth/rbac";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { SettingsService } from "@/modules/settings/services/settings.service";

export async function removeFaviconAction() {
  await requireUserId();
  await requirePermission(PERMISSIONS.settings.update);

  const service = new SettingsService();
  const settings = await service.removeFavicon();
  revalidatePath("/", "layout");
  return { success: true as const, settings };
}
