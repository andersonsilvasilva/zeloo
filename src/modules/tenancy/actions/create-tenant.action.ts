"use server";

import { revalidatePath } from "next/cache";
import { requirePermission, requireUserId } from "@/lib/auth/rbac";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { requireRootTenant } from "@/lib/tenancy/current-tenant";
import { provisionTenantSchema, type ProvisionTenantFormInput } from "@/modules/tenancy/schemas/provision-tenant.schema";
import { provisionTenant, TenantSlugInvalidError } from "@/modules/tenancy/services/tenant-onboarding.service";

export async function createTenantAction(rawInput: ProvisionTenantFormInput) {
  await requireUserId();
  await requireRootTenant();
  await requirePermission(PERMISSIONS.platform.manageTenants);

  const input = provisionTenantSchema.parse(rawInput);

  try {
    const result = await provisionTenant(input);
    if (result.alreadyProvisioned) {
      return { success: false as const, error: `O slug "${input.slug}" já está em uso por outro tenant.` };
    }
    revalidatePath("/plataforma/tenants");
    return { success: true as const, tenant: result };
  } catch (error) {
    if (error instanceof TenantSlugInvalidError) {
      return { success: false as const, error: error.message };
    }
    throw error;
  }
}
