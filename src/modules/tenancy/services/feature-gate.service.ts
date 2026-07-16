import { TenancyRepository } from "@/modules/tenancy/repositories/tenancy.repository";
import { SubscriptionService } from "@/modules/tenancy/services/subscription.service";

function parseBoolean(value: string | undefined): boolean {
  return value === "true" || value === "1";
}

/**
 * Checagem server-side de feature habilitada por plano — nunca confiar em
 * botão escondido no frontend (CLAUDE_CODE_MULTI_TENANT_ZELOO.md §13).
 * `TenantLimit` funciona como override pontual por tenant, checado antes do
 * valor do plano.
 */
export class FeatureGate {
  async isEnabled(tenantId: string, featureKey: string): Promise<boolean> {
    const repo = new TenancyRepository();

    const override = await repo.findTenantLimit(tenantId, featureKey);
    if (override) return parseBoolean(override.value);

    const subscriptionService = new SubscriptionService();
    const subscription = await subscriptionService.getActiveSubscription(tenantId);
    if (!subscription) return false;

    return parseBoolean(subscription.features[featureKey]);
  }
}
