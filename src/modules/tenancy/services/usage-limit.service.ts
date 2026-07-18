import { TenancyRepository } from "@/modules/tenancy/repositories/tenancy.repository";
import { SubscriptionService } from "@/modules/tenancy/services/subscription.service";

export interface LimitCheckResult {
  allowed: boolean;
  limit: number | null;
  current: number;
}

/**
 * Compara o uso atual de um tenant contra o limite numérico do plano
 * (com override de `TenantLimit`, quando existir). Limite ausente = sem
 * teto (ex.: plano Enterprise) — quem chama decide se isso é aceitável.
 */
export class UsageLimitService {
  async checkLimit(tenantId: string, key: string, currentUsage: number): Promise<LimitCheckResult> {
    const limit = await this.resolveLimit(tenantId, key);
    if (limit === null) return { allowed: true, limit: null, current: currentUsage };
    return { allowed: currentUsage < limit, limit, current: currentUsage };
  }

  async resolveLimit(tenantId: string, key: string): Promise<number | null> {
    const repo = new TenancyRepository();

    const override = await repo.findTenantLimit(tenantId, key);
    if (override) return Number(override.value);

    const subscriptionService = new SubscriptionService();
    const subscription = await subscriptionService.getActiveSubscription(tenantId);
    const raw = subscription?.features[key];
    return raw === undefined ? null : Number(raw);
  }

  async recordUsage(tenantId: string, key: string, period: string, amount = 1): Promise<void> {
    const repo = new TenancyRepository();
    await repo.incrementUsage(tenantId, key, period, amount);
  }
}
