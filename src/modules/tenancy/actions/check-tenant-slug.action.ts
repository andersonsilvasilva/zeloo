"use server";

import { requirePermission, requireUserId } from "@/lib/auth/rbac";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { requireRootTenant } from "@/lib/tenancy/current-tenant";
import { tenantSlugSchema } from "@/modules/tenancy/schemas/tenant.schema";
import { TenancyRepository } from "@/modules/tenancy/repositories/tenancy.repository";

export interface CheckTenantSlugResult {
  available: boolean;
  /** Presente só quando `available` é false — inválido (formato/reservado) ou já em uso. */
  reason?: string;
}

export async function checkTenantSlugAction(rawSlug: string): Promise<CheckTenantSlugResult> {
  await requireUserId();
  await requireRootTenant();
  await requirePermission(PERMISSIONS.platform.manageTenants);

  const parsed = tenantSlugSchema.safeParse(rawSlug);
  if (!parsed.success) {
    return { available: false, reason: parsed.error.issues[0]?.message ?? "Slug inválido." };
  }

  const repo = new TenancyRepository();
  const exists = await repo.slugExists(parsed.data);
  if (exists) {
    return { available: false, reason: "Esse slug já está em uso por outro tenant." };
  }

  return { available: true };
}
