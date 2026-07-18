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

/** Item da lista de tenants na tela de plataforma (`/plataforma/tenants`). */
export interface TenantListItem {
  id: string;
  name: string;
  slug: string;
  status: TenantSummary["status"];
  trialEndsAt: Date | null;
  createdAt: Date;
  ownerName: string | null;
  ownerEmail: string | null;
  /** true = é o tenant raiz (ROOT_TENANT_SLUG) — status não pode ser alterado por aqui. */
  isRoot: boolean;
}

/** Bundle de recursos de um plano, já resolvido (key -> value bruto do PlanFeature). */
export type PlanFeatureMap = Record<string, string>;
