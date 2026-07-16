import { TenancyRepository } from "@/modules/tenancy/repositories/tenancy.repository";
import type { PlanFeatureMap } from "@/modules/tenancy/types/tenancy.types";

export interface ActiveSubscriptionInfo {
  subscriptionId: string;
  planId: string;
  planSlug: string;
  status: "TRIALING" | "ACTIVE" | "PAST_DUE" | "CANCELED";
  features: PlanFeatureMap;
}

/**
 * Resolve a assinatura ativa (ou em trial) de um tenant. Sem integração de
 * cobrança nesta fase (CLAUDE_CODE_MULTI_TENANT_ZELOO.md §13) — só leitura.
 */
export class SubscriptionService {
  async getActiveSubscription(tenantId: string): Promise<ActiveSubscriptionInfo | null> {
    const repo = new TenancyRepository();
    const subscription = await repo.findActiveSubscription(tenantId);
    if (!subscription) return null;

    const features: PlanFeatureMap = {};
    for (const f of subscription.plan.features) features[f.key] = f.value;

    return {
      subscriptionId: subscription.id,
      planId: subscription.planId,
      planSlug: subscription.plan.slug,
      status: subscription.status,
      features,
    };
  }
}
