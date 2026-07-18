# Fase 1 — Arquitetura multi-tenant

> Depende de `docs/tenancy/00-audit.md` (Fase 0) — ler antes. Este documento registra as decisões arquiteturais e o que foi efetivamente criado nesta fase: apenas **tabelas globais novas**, nenhuma tabela existente foi alterada (isso é trabalho da Fase 3, "Migração de banco sem perda de dados").

## 1. Modelo adotado

```text
Modelo: shared database + shared schema
Identificação pública: subdomínio (com um caso especial: o tenant "zeloo" — ver decisão de negócio #2 da Fase 0 — é servido no domínio raiz zeloo.net/www.zeloo.net, sem subdomínio)
Isolamento de dados: tenant_id (a partir da Fase 3, nas tabelas tenant-owned já classificadas em 00-audit.md §11)
Base de código: única
Deploy: único
Banco: compartilhado (sem plano de banco dedicado por tenant nesta etapa)
```

## 2. Modelo de usuário: identidade global + membership (decisão de negócio #1 da Fase 0)

Confirmado que um mesmo login pode operar em mais de um tenant. Isso implica:

- `User` continua como está (identidade global, `email` único globalmente) — **nenhuma mudança nesta fase**.
- Nova tabela `TenantUser` (membership): liga `User` a `Tenant`, com `status` próprio (ex.: pode estar `ACTIVE` num tenant e `SUSPENDED` em outro, um dia).
- **Desvio deliberado do SQL conceitual do spec**: o exemplo do spec (`CLAUDE_CODE_MULTI_TENANT_ZELOO.md` §12) coloca `role_id` direto na tabela `tenant_users` (um papel só por membership). Este projeto já tem um sistema de RBAC mais rico (`Role`/`Permission`/`RolePermission`/`UserRole`, `@@unique([userId, roleId])` — um usuário pode ter **múltiplos papéis simultâneos**). Regra do spec (§3, item 2: "não remova funcionalidades existentes") — colapsar pra um único `role_id` por membership seria regressão. Por isso `TenantUser` **não tem `role_id`**; a atribuição de papel continua via `UserRole`, que passa a ganhar contexto de tenant **na Fase 3** (quando `UserRole` — tabela existente — for alterada para `@@unique([userId, roleId, tenantId])`). Aqui na Fase 1 isso é só documentado, não implementado, pra não misturar "tabela nova" com "tabela existente alterada".
- `Role`, `Permission`, `RolePermission` continuam **globais** (catálogo fixo compartilhado, sem customização por tenant no v1) — confirmado em 00-audit.md §11.

## 3. Modelo `Tenant`

Campos conforme o exemplo conceitual do spec (§10), adaptados ao Prisma/MySQL do projeto (convenção do repo: `id String @id @default(cuid())`, timestamps `createdAt`/`updatedAt`, `@@map` pra snake_case):

```prisma
model Tenant {
  id            String       @id @default(cuid())
  name          String
  slug          String       @unique
  status        TenantStatus @default(TRIAL)
  planId        String?      @map("plan_id")
  customDomain  String?      @map("custom_domain")
  timezone      String       @default("America/Sao_Paulo")
  locale        String       @default("pt-BR")
  settings      Json?
  trialEndsAt   DateTime?    @map("trial_ends_at")

  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")
}

enum TenantStatus {
  TRIAL
  ACTIVE
  SUSPENDED
  CANCELLED
}
```

`settings Json?` aqui é **branding/config específico do tenant** (Fase 8 do spec — cores, módulos habilitados) — não confundir com a tabela `Setting` (key-value) existente, que vira tenant-owned na Fase 3 e continua guardando os dados operacionais atuais (endereço, telefone, credenciais de integração).

## 4. Slugs reservados

Lista e regras exatamente como especificado (`CLAUDE_CODE_MULTI_TENANT_ZELOO.md` §11), implementadas em `src/modules/tenancy/schemas/tenant.schema.ts`:

- Regex: `^[a-z0-9](?:[a-z0-9-]{1,61}[a-z0-9])?$`, 3–63 caracteres.
- Normalização (lowercase + trim) antes de validar.
- Lista de reservados: `www, app, api, admin, auth, login, logout, signup, register, status, support, suporte, mail, email, financeiro, billing, static, assets, cdn, files, storage, health, metrics`.
- **Nota**: `zeloo` (slug do tenant inicial) não está nessa lista — não colide.

## 5. Planos e assinatura (base mínima, sem cobrança)

Seguindo §13 do spec — sem integração de cobrança automática nesta fase. Desenho escolhido, consistente com o padrão key-value já usado pela tabela `Setting` deste projeto (em vez de um único JSON de features, que seria menos consultável em queries/relatórios futuros):

```prisma
model Plan {
  id        String   @id @default(cuid())
  name      String
  slug      String   @unique
  active    Boolean  @default(true)

  features      PlanFeature[]
  subscriptions Subscription[]

  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")
}

// Uma linha por recurso do plano — ex.: key="appointments_per_month", value="3000".
// Interpretação do value (bool/número) é responsabilidade de quem lê (FeatureGate/UsageLimitService),
// mesmo padrão já usado por `Setting.type` neste projeto.
model PlanFeature {
  id     String @id @default(cuid())
  planId String @map("plan_id")
  key    String
  value  String

  plan Plan @relation(fields: [planId], references: [id], onDelete: Cascade)

  @@unique([planId, key])
}

model Subscription {
  id                 String             @id @default(cuid())
  tenantId           String             @map("tenant_id")
  planId             String             @map("plan_id")
  status             SubscriptionStatus @default(TRIALING)
  currentPeriodStart DateTime?          @map("current_period_start")
  currentPeriodEnd   DateTime?          @map("current_period_end")

  tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  plan   Plan   @relation(fields: [planId], references: [id], onDelete: Restrict)

  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  @@index([tenantId])
}

enum SubscriptionStatus {
  TRIALING
  ACTIVE
  PAST_DUE
  CANCELED
}

// Override pontual de um limite de plano pra um tenant específico (ex.: cliente negociou mais storage).
model TenantLimit {
  id       String @id @default(cuid())
  tenantId String @map("tenant_id")
  key      String
  value    String

  tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  @@unique([tenantId, key])
}

// Consumo real medido por tenant/período/métrica — base pro UsageLimitService comparar contra o plano.
model UsageRecord {
  id       String   @id @default(cuid())
  tenantId String   @map("tenant_id")
  key      String
  period   String   // "yyyy-MM"
  value    Int      @default(0)

  tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  @@unique([tenantId, key, period])
}
```

Serviços criados em `src/modules/tenancy/services/` (funcionais, mas **sem nenhum caller ainda** — não há contexto de tenant em nenhuma requisição até a Fase 2/4):

- `FeatureGate.isEnabled(tenantId, featureKey)` — lê `PlanFeature` da assinatura ativa do tenant, considera `TenantLimit` como override.
- `UsageLimitService.checkLimit(tenantId, key, currentUsage)` — compara `UsageRecord`/uso atual contra o limite numérico do plano (com override de `TenantLimit`).
- `SubscriptionService.getActiveSubscription(tenantId)` — resolve a assinatura ativa (ou trial) do tenant.

## 6. O que NÃO foi feito nesta fase (de propósito)

- Nenhuma tabela existente (`User`, `Setting`, `Client`, etc.) foi alterada — isso é Fase 3.
- Nenhum middleware/resolver de tenant por subdomínio foi criado — isso é Fase 2.
- Nenhuma UI de onboarding/criação de tenant — isso é Fase 9.
- `FeatureGate`/`UsageLimitService`/`SubscriptionService` não têm nenhum ponto de chamada real ainda (nada no app tem `tenantId` disponível até a Fase 2/4).

## 7. Migration aplicada

`prisma migrate dev` gerado e aplicado **apenas no banco local de desenvolvimento** (`barbershop_staging`) — só `CREATE TABLE` de tabelas novas (`tenants`, `tenant_users`, `plans`, `plan_features`, `subscriptions`, `tenant_limits`, `usage_records`), nenhum `ALTER TABLE` em tabela existente. **Não aplicada em produção** — depende de janela de manutenção combinada (decisão de negócio #4 da Fase 0) e, mais adiante, do trabalho de Fase 3 (que altera tabelas existentes de verdade).
