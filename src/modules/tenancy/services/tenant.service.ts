import { TenancyRepository } from "@/modules/tenancy/repositories/tenancy.repository";
import type { CreateTenantInput } from "@/modules/tenancy/schemas/tenant.schema";
import type { TenantSummary } from "@/modules/tenancy/types/tenancy.types";

export class TenantSlugTakenError extends Error {
  constructor() {
    super("Esse slug já está em uso.");
    this.name = "TenantSlugTakenError";
  }
}

/**
 * CRUD básico de tenant — só isso na Fase 1. Onboarding completo (criação
 * transacional com membership/roles/subscription de trial, ver
 * CLAUDE_CODE_MULTI_TENANT_ZELOO.md §43) é Fase 9, ainda não implementada.
 */
export class TenantService {
  async create(input: CreateTenantInput): Promise<TenantSummary> {
    const repo = new TenancyRepository();
    const taken = await repo.slugExists(input.slug);
    if (taken) throw new TenantSlugTakenError();

    const tenant = await repo.createTenant({
      name: input.name,
      slug: input.slug,
      timezone: input.timezone,
      locale: input.locale,
      planId: input.planId,
    });

    return this.toSummary(tenant);
  }

  async findBySlug(slug: string): Promise<TenantSummary | null> {
    const repo = new TenancyRepository();
    const tenant = await repo.findTenantBySlug(slug);
    return tenant ? this.toSummary(tenant) : null;
  }

  private toSummary(tenant: {
    id: string;
    name: string;
    slug: string;
    status: string;
    planId: string | null;
    timezone: string;
    locale: string;
    trialEndsAt: Date | null;
  }): TenantSummary {
    return {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      status: tenant.status as TenantSummary["status"],
      planId: tenant.planId,
      timezone: tenant.timezone,
      locale: tenant.locale,
      trialEndsAt: tenant.trialEndsAt,
    };
  }
}
