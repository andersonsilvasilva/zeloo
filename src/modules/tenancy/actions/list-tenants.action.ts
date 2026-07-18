"use server";

import { requirePermission, requireUserId } from "@/lib/auth/rbac";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { requireRootTenant } from "@/lib/tenancy/current-tenant";
import { TenantService } from "@/modules/tenancy/services/tenant.service";
import type { TenantListItem } from "@/modules/tenancy/types/tenancy.types";

export async function listTenantsAction(): Promise<TenantListItem[]> {
  await requireUserId();
  await requireRootTenant();
  await requirePermission(PERMISSIONS.platform.manageTenants);

  const service = new TenantService();
  return service.listAll();
}
