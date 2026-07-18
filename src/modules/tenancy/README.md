# Módulo: tenancy

Fundação multi-tenant (Fase 1 — ver `docs/tenancy/01-architecture.md`): entidade `Tenant`, membership (`TenantUser`), planos/assinatura (`Plan`/`PlanFeature`/`Subscription`/`TenantLimit`/`UsageRecord`).

## Estrutura
- repositories/ — Acesso ao Prisma/MySQL
- schemas/      — Zod schemas (validação de slug, criação de tenant)
- services/     — `TenantService`, `FeatureGate`, `UsageLimitService`, `SubscriptionService`
- types/        — Tipos TypeScript específicos do módulo

## Regra
Componentes React NUNCA importam Prisma diretamente. Sempre: Component -> Action -> Service -> Repository.

## Status (Fase 1)
Só fundação de dados/serviços — **sem nenhum caller real ainda**. Não existe:
- `actions/` nem `components/` — onboarding de tenant é Fase 9 do spec.
- Tenant Resolver (Fase 2) — nenhuma requisição tem `tenantId` disponível hoje.
- Isolamento de queries nas tabelas existentes (Fase 3/4) — `Client`, `Appointment`, `Setting` etc. continuam sem `tenant_id`.

`FeatureGate`/`UsageLimitService`/`SubscriptionService` são funcionais dado um `tenantId`, mas nada no app ainda tem um `tenantId` de requisição pra passar pra eles.
