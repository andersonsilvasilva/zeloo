# Fase 0 — Auditoria técnica (Zeloo.net → multi-tenant)

> Gerado em 2026-07-15. Auditoria read-only — nenhum arquivo de aplicação foi alterado nesta fase.
> Escopo: inventário do stack real, classificação de entidades e mapeamento de pontos de acesso a dados, conforme `CLAUDE_CODE_MULTI_TENANT_ZELOO.md` §5–§8.

## 1. Stack real

| Item | Valor |
|---|---|
| Linguagem/framework | TypeScript + Next.js 14.2.35 (App Router, `output: "standalone"`) |
| Runtime | Node.js 20.x (produção: VPS Ubuntu 22.04, Node 20.20.2 via NodeSource) |
| ORM | Prisma 5.18.0, `engineType = "binary"` (não `library` — CageFS da hospedagem antiga travava com "PANIC: timer has gone away"), `binaryTargets` cobrindo Windows dev + Debian/Ubuntu prod |
| Banco | MySQL 8+ (`datasource db { provider = "mysql" }`) |
| Autenticação | NextAuth v5 beta (`next-auth@^5.0.0-beta.31`), provider `Credentials` (email+senha, bcrypt), `session.strategy = "jwt"` |
| Validação | Zod 3.23.8, schemas compartilhados front/back por módulo |
| UI | Tailwind 3.4.7 + Radix UI + `class-variance-authority`, Recharts 2.12.7 (gráficos), React Hook Form |
| Imagens | `sharp` 0.33.4 (gera variantes thumb/medium/large) |
| Deploy | Manual (build local → tar.gz sem `.env`/uploads → scp → extração) sobre VPS Hostinger KVM2, Nginx (reverse proxy :80/:443 → 127.0.0.1:3000) + PM2 (processo único `barbearia`) |
| CI/CD | **Inexistente** — sem `.github/workflows` nem qualquer outro pipeline |
| Testes | **Inexistente** — `vitest` e `@playwright/test` estão em `devDependencies` mas sem nenhum arquivo de teste, config (`vitest.config.*`, `playwright.config.*`) nem script no `package.json` |

## 2. Sessão / autenticação — detalhe crítico

- `src/lib/auth/auth.config.ts`: config "edge-safe" (sem Prisma/bcrypt) — `session: { strategy: "jwt" }`, `providers: []`. Pensada para o middleware, mas **não está de fato importada em `middleware.ts`** hoje (ver §4).
- `src/lib/auth/auth.ts`: config completa (Node runtime), adiciona `Credentials` → `AuthService.validateCredentials` → `findActiveUserByEmail` (bcrypt compare).
- JWT/sessão carregam **só** `user.id`. Nenhum papel/permissão é embutido no token.
- `src/lib/auth/rbac.ts` — `getSessionPermissions()` faz **lookup fresco no banco a cada request** (`prisma.userRole.findMany` com include de `role.permissions.permission`), cacheado só via `React.cache()` (por request, não persistente). Isso é uma vantagem para a migração: não há necessidade de invalidar JWT ao mudar de tenant/role — mas também significa que **hoje não existe nenhum conceito de "tenant atual" em lugar nenhum da sessão**.

## 3. Middleware — bloqueador arquitetural a resolver na Fase 1

`middleware.ts` (raiz do projeto) é **efetivamente um no-op hoje**, de propósito:

```ts
export const config = { matcher: [] };
```

Motivo documentado no próprio arquivo: em 2026-07-10, `NextResponse.redirect()` dentro do middleware, rodando via Passenger (hospedagem compartilhada antiga), disparava um bug conhecido do Next.js (`vercel/next.js#77568`) — o servidor tentava um self-fetch interno em `http://0.0.0.0:<porta>` para resolver o redirect, endereço que o Passenger não expõe, travando login e Server Actions (GET e POST). A proteção de rotas foi movida pra `redirect()` do `next/navigation` dentro de `app/(app)/layout.tsx` (mecanismo diferente, sem esse problema).

**Risco para a Fase 2:** o modelo de Tenant Resolver do spec (`CLAUDE_CODE_MULTI_TENANT_ZELOO.md` §15) pressupõe middleware ativo para extrair o subdomínio antes do roteamento. Dois pontos precisam de decisão na Fase 1, não nesta auditoria:
1. A app **já não roda mais na hospedagem compartilhada com Passenger** — está numa VPS dedicada com Nginx desde 2026-07-13 (ver memória do projeto). O bug documentado é específico do Passenger; não há evidência de que ainda se aplique atrás do Nginx atual. Precisa de teste dirigido antes de reativar o middleware.
2. Mesmo reativando, resolução de tenant não precisa chamar `NextResponse.redirect()` — pode usar `NextResponse.next()` com rewrite/header carregando o tenant resolvido, deixando erros (tenant inexistente/suspenso) para uma camada Node-side (layout/page), no mesmo padrão já usado hoje pra guarda de autenticação. Isso evita reintroduzir o bug documentado.

## 4. `next.config.js` — relevante para múltiplos tenants

```js
{
  output: "standalone",
  images: { remotePatterns: [{ protocol: "http", hostname: "localhost" }] },
  headers: [
    { source: "/login", headers: [{ key: "Cache-Control", value: "no-store" }] },
    { source: "/agendar", ... },
    { source: "/agendar/escolher", ... },
  ],
}
```

Sem `rewrites()`/`redirects()`. Os headers `no-store` existem por causa de um CDN da hospedagem antiga (hcdn) que cacheava HTML estático por 1 ano; a Nginx atual não tem esse problema, mas os headers foram mantidos (inofensivos). `images.remotePatterns` só libera `http://localhost` — nenhum domínio de CDN/S3 futuro está liberado ainda (relevante quando storage migrar pra S3/R2 por tenant, Fase 7 do spec).

O projeto **já aprendeu, por incidente real** (2026-07-15, ver memória `project-deploy-pitfalls-hostinger` armadilha #5), que páginas `○ Static` que leem dado de negócio "congelam" com o banco usado no build — `app/agendar/page.tsx` e `app/agendar/escolher/page.tsx` já usam `export const dynamic = "force-dynamic"` por causa disso. **Essa lição fica ainda mais crítica em multi-tenant**: qualquer página que renderize dado de um tenant específico precisa continuar 100% dinâmica (nunca estática/ISR compartilhada entre tenants), sob pena de vazar dado de um tenant pro cache servido a outro.

## 5. Estrutura de módulos

`src/modules/` tem **15 módulos**: `accounts`, `appointments`, `audit`, `auth`, `booking`, `clients`, `commissions`, `finance`, `media`, `messages`, `professionals`, `reports`, `services`, `settings`, `users`.

Padrão consistente em todos: `Component (client) → Server Action → Service → Repository → Prisma`. Componentes React nunca importam Prisma diretamente (regra documentada em cada `README.md` de módulo). Isso é uma vantagem grande pra isolamento: **toda query tenant-owned passa por um repository** — 15 arquivos de repository ao todo, um ponto de injeção natural por módulo pra escopo de tenant.

- `src/modules/media/` é só scaffold (README, zero código) — upload hoje vive espalhado dentro de clients/professionals/services/settings, cada um com sua própria action de upload chamando `getStorageProvider()`.
- 96 Server Actions no total, maior concentração em `finance` (11), `accounts` (10), `messages`/`clients`/`settings` (9 cada).
- Existem **dois** `user.repository.ts` distintos: `auth/repositories/` (só `findActiveUserByEmail`, login) e `users/repositories/` (CRUD administrativo) — atenção ao adaptar os dois.

## 6. Armazenamento de arquivos

`src/lib/storage/` — interface `StorageProvider` (`upload`/`delete`/`getUrl`/`replace`) com um único provider implementado (`LocalStorageProvider`); `S3StorageProvider`/`R2StorageProvider`/`SupabaseStorageProvider` estão documentados como planejados mas não existem ainda.

`LocalStorageProvider` grava em `public/uploads/<folder>/<nanoid-suffix>-{thumb,medium,large}.<ext>`, `folder` definido pelo chamador (`"professionals"`, `"services"`, `"logo"`, `"favicon"`, etc.) — **sem nenhum prefixo de tenant hoje**. `getUrl()` retorna `/uploads/<storagePath>`, servido diretamente pelo Nginx via `location /uploads/ { alias .../public/uploads/; }` (contorna uma limitação do Next standalone documentada em incidente anterior — o roteador do Next só escaneia `public/` uma vez, no boot do processo).

**Risco:** migrar pra `tenants/{tenantId}/...` (Fase 7 do spec) exige mudar tanto `LocalStorageProvider` quanto a config do Nginx que serve esses arquivos diretamente do disco.

## 7. Integrações externas

| Integração | Onde vive | Como pega credencial | Observação pra multi-tenant |
|---|---|---|---|
| WhatsApp Business API (Meta) | `src/lib/whatsapp/whatsapp-client.ts` | **Variáveis de ambiente** (`WHATSAPP_BUSINESS_API_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_TEMPLATE_NAME`, `WHATSAPP_TEMPLATE_LANGUAGE`) — uma conta pra app inteiro | **Precisa virar config por tenant** (cada negócio tem seu próprio número/token Meta) — hoje é estruturalmente impossível ter 2 tenants com WhatsApp próprio |
| Mercado Pago (Pix) | `src/lib/mercadopago/mercadopago-client.ts` | **Já vem do banco** (`Setting` via `SettingsService`, editável em Configurações → Pagamentos) — token passado por chamada, não por env var | Já é o padrão certo — só precisa o `Setting` ganhar `tenant_id`. Webhook (`/api/webhooks/mercadopago`) recebe notificação do Mercado Pago **sem contexto de subdomínio** — precisa de estratégia própria pra resolver o tenant (ex.: path do webhook incluir o slug, ou lookup pelo `access_token`/conta usada) |
| Twilio (SMS) | vars `TWILIO_ACCOUNT_SID/AUTH_TOKEN/SMS_FROM` no `.env.example` | env var | Não localizei uso ativo no código além das vars documentadas — confirmar se é código morto ou canal secundário real antes de migrar |
| Zenvia | var `ZENVIA_API_TOKEN` no `.env.example` | env var | Mesma observação do Twilio |

## 8. Cache, filas, scheduler, WebSockets

**Nenhum existe.** Sem Redis, sem BullMQ/Bull, sem `node-cron`, sem worker process separado (PM2 roda um único processo, o app Next). Os únicos `setInterval` do projeto são client-side (relógio da agenda do dia, polling de status de cobrança Pix) — não são processos de servidor.

A única rotina "recorrente" do sistema (`RecurringAccountEntry` → gera `AccountEntry` do mês) roda **lazy, sob demanda**, dentro de `AccountService.ensureRecurringGenerated()`, chamada no topo de toda listagem de contas — não é um job agendado.

**Implicação pra Fase 6 do spec:** como não existe infraestrutura de cache/fila/scheduler hoje, essa fase é majoritariamente **N/A no v1** — não há nada pra tornar tenant-aware ainda. Only fica como trabalho futuro se/quando Redis ou uma fila forem introduzidos.

## 9. Testes e CI/CD

Zero testes, zero CI. Isso é uma lacuna grave considerando o Critério de Aceite da Fase 11 do spec (matriz de isolamento cross-tenant obrigatória) — a Fase 11 vai precisar **criar a infraestrutura de testes do zero** (não só adaptar testes existentes), incluindo escolher/configurar runner (Vitest já está instalado mas não configurado) antes de conseguir escrever os casos de isolamento.

## 10. Tabelas e entidades atuais (schema Prisma — 28 models)

`User`, `Role`, `Permission`, `RolePermission`, `UserRole`, `Client`, `Professional`, `Service`, `ProfessionalService`, `Appointment`, `AppointmentService`, `Payment`, `PixCharge`, `CashbookEntry`, `CashRegister`, `CashRegisterClosing`, `RecurringAccountEntry`, `AccountEntry`, `CommissionClosing`, `MessageTemplate`, `MessageLog`, `Media`, `Setting`, `AuditLog`.

Nenhuma tabela tem `tenant_id` ou equivalente hoje — confirmado por busca (`grep -r "tenant" src/` → zero resultados fora deste documento e do próprio spec). O único traço de intenção multi-tenant no código é um comentário no topo do `schema.prisma` ("Preparado para futura multi-tenant") e uma linha de TODO no `README.md` — nenhuma decisão de modelagem foi tomada ainda.

## 11. Matriz de classificação de tabelas

| Tabela | Categoria | Precisa `tenant_id`? | Estratégia | Risco |
|---|---|---:|---|---|
| `tenants` (nova) | Global | — | Nova tabela raiz | Baixo |
| `plans`, `plan_features`, `subscriptions`, `tenant_limits`, `usage_records` (novas) | Global | — | Novas tabelas (Fase 1 §13 do spec) | Baixo — nenhuma cobrança automática nesta fase |
| `tenant_users`/`memberships` (nova) | Global (associativa) | `tenant_id` na própria tabela associativa | Nova tabela — ver decisão pendente abaixo | **Médio-alto** — decisão de negócio pendente |
| `Role`, `Permission`, `RolePermission` | Global (catálogo) | Não, em v1 | Continuam como catálogo fixo compartilhado (ADMIN/PROFESSIONAL/ATTENDANT/CASHIER/CLIENT) — sem customização por tenant no v1 | Baixo, mas revisar se algum tenant vai querer papéis próprios no futuro |
| `User` | **Híbrido — decisão pendente** | Depende da decisão abaixo | Ver "Decisão de negócio #1" | **Alto** |
| `UserRole` | Tenant-owned (segue `User`) | Implícito via `User`/membership | — | Médio |
| `Client` | Tenant-owned | Sim | `tenant_id` obrigatório | Baixo |
| `Professional` | Tenant-owned | Sim | `tenant_id` obrigatório | Baixo |
| `Service` | Tenant-owned | Sim | `tenant_id` obrigatório; **`slug` hoje é `@unique` global → precisa virar `@@unique([tenantId, slug])`** | Médio (constraint única a migrar) |
| `ProfessionalService` | Tenant-owned (via FK) | Não diretamente — herda de `Professional`/`Service` | — | Baixo |
| `Appointment`, `AppointmentService` | Tenant-owned | Sim (`Appointment`) | `tenant_id` obrigatório em `Appointment`; `AppointmentService` herda via FK | Baixo |
| `Payment`, `PixCharge` | Tenant-owned | Sim | `tenant_id` obrigatório. `PixCharge.mercadoPagoPaymentId` é `@unique` global — isso é correto (ID externo do Mercado Pago), não precisa mudar | Médio — ver risco do webhook no item 7 |
| `CashbookEntry`, `CashRegister`, `CashRegisterClosing` | Tenant-owned | Sim | `tenant_id` obrigatório | Baixo |
| `RecurringAccountEntry`, `AccountEntry` | Tenant-owned | Sim | `tenant_id` obrigatório; atenção ao `@@unique([recurringEntryId, dueDate])` existente — provavelmente continua correto sem mudança (já implicitamente escopado pelo `recurringEntryId`) | Baixo |
| `CommissionClosing` | Tenant-owned (via `Professional`) | Não diretamente — herda de `Professional` | Considerar `tenant_id` direto mesmo assim, pra evitar join extra em toda query de isolamento | Baixo |
| `MessageTemplate` | Tenant-owned | Sim | Cada negócio provavelmente vai querer template próprio (e precisa, já que o WhatsApp Business Token passa a ser por tenant) | Médio |
| `MessageLog` | Tenant-owned (via `Client`) | Recomendado `tenant_id` direto | Evita join em toda auditoria/relatório de mensagens | Baixo |
| `Media` | Tenant-owned | Sim | `tenant_id` obrigatório + prefixo de path (`tenants/{tenantId}/...`) | Médio (mexe em storage + Nginx) |
| `Setting` | **Tenant-owned — mudança estrutural relevante** | Sim | Hoje é `key` `@unique` global (key-value flat). Precisa virar `@@unique([tenantId, key])`. **Usado pervasivamente**: branding, timezone, endereço, link do Google Maps, credenciais Mercado Pago, redes sociais — todo o módulo `settings` (repository + service) precisa ser revisado | **Alto** — é a tabela mais transversal do sistema |
| `AuditLog` | Híbrido | `tenant_id` nullable | Ações de plataforma (ex.: criação de tenant) não têm tenant; ações operacionais têm | Baixo |

## 12. Decisões de negócio (respondidas em 2026-07-15)

Conforme regra do spec (§73: "quando uma decisão depender obrigatoriamente de informação comercial não presente no projeto... implemente uma variável obrigatória... sem inventar o valor"), as decisões abaixo foram confirmadas diretamente pelo usuário:

1. **Um mesmo login pode pertencer a mais de um tenant? → SIM.** `User` vai virar identidade global + tabela `tenant_users`/`memberships` (modelo recomendado pelo spec §12). Implica: `User.email` continua único globalmente (não muda pra único-por-tenant); a associação usuário↔tenant, o papel (`UserRole`) e o "tenant atual" da sessão vivem na camada de membership, não em `User` diretamente.
2. **Slug do tenant inicial (backfill dos dados reais) → `zeloo`.** Ressalva já levantada e aceita: como o domínio base da plataforma também é `zeloo.net`, o tenant "dono" em `zeloo.zeloo.net` é uma URL atípica — vale revisitar na Fase 1 se esse tenant deve viver no domínio raiz (`zeloo.net` sem subdomínio) em vez de um subdomínio próprio, mas o slug interno (`tenants.slug = "zeloo"`) fica definido.
3. **Twilio/Zenvia → não estão em uso.** Tratar como não prioritários na migração (as vars seguem só em `.env.example`, sem integração ativa a adaptar por tenant).
4. **Produção em uso comercial ativo (inclusive demo a clientes na semana desta auditoria)** — segue valendo: qualquer migração de dados (Fase 3+) exige backup + janela de manutenção combinada, não é ambiente de teste.

## 13. Riscos gerais encontrados (resumo)

- Middleware inativo por incidente documentado em hospedagem já descontinuada — precisa validação na infra atual (VPS+Nginx) antes de reativar (item 3).
- `Setting` como key-value flat é usado em quase todo módulo — maior superfície de mudança da Fase 3 (item 11).
- WhatsApp hoje é mono-tenant por construção (env vars) — bloqueia qualquer segundo tenant até virar config por tenant (item 7).
- Webhook do Mercado Pago não tem como saber de qual tenant é a notificação sem mudança de estratégia (item 7).
- Zero testes e zero CI — Fase 11 do spec começa do zero, não de uma base existente.
- Nenhuma tabela tem índice ou FK pensada pra `tenant_id` — todas as constraints únicas precisam de revisão individual (`Service.slug` é o caso confirmado; outras a revisar na Fase 1).
- Ambiente de produção está ativo e em uso comercial real — qualquer migration de dados exige backup + janela de manutenção, não pode ser tratado como ambiente de teste.

## 14. Critério de conclusão da Fase 0

Inventário de tabelas (§11) e pontos de acesso a dados concluído. **Migrations não foram iniciadas.** Próximo passo: decisões de negócio do item 12 antes de abrir a Fase 1 (arquitetura).
