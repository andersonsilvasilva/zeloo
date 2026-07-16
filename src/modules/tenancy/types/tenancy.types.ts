export interface TenantSummary {
  id: string;
  name: string;
  slug: string;
  status: "TRIAL" | "ACTIVE" | "SUSPENDED" | "CANCELLED";
  planId: string | null;
  timezone: string;
  locale: string;
  trialEndsAt: Date | null;
}

/** Bundle de recursos de um plano, já resolvido (key -> value bruto do PlanFeature). */
export type PlanFeatureMap = Record<string, string>;
