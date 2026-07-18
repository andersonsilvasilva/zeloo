"use server";

import { revalidatePath } from "next/cache";
import { requirePermission, requireUserId } from "@/lib/auth/rbac";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { requireRootTenant } from "@/lib/tenancy/current-tenant";
import { tenantStatusSchema } from "@/modules/tenancy/schemas/tenant.schema";
import {
  updateTenantStatus,
  CannotChangeRootTenantStatusError,
  TenantNotFoundError,
} from "@/modules/tenancy/services/tenant-onboarding.service";
import { z } from "zod";

const inputSchema = z.object({ id: z.string().cuid(), status: tenantStatusSchema });

export async function updateTenantStatusAction(rawInput: z.infer<typeof inputSchema>) {
  const userId = await requireUserId();
  await requireRootTenant();
  await requirePermission(PERMISSIONS.platform.manageTenants);

  const input = inputSchema.parse(rawInput);

  try {
    const result = await updateTenantStatus(input.id, input.status, userId);
    revalidatePath("/plataforma/tenants");
    return { success: true as const, tenant: result };
  } catch (error) {
    if (error instanceof TenantNotFoundError || error instanceof CannotChangeRootTenantStatusError) {
      return { success: false as const, error: error.message };
    }
    throw error;
  }
}
