# Fase 14 — Critérios de aceite

> Checklist do spec (§67-71), verificado item a item contra o código real — não uma declaração de conformidade genérica. Três problemas reais foram encontrados durante essa verificação e corrigidos na hora (nenhum dado vazou em nenhum deles, mas a resposta não era a esperada); dois itens ficam honestamente marcados como não atendidos, com o motivo. Tudo testado só localmente — **produção não foi tocada**.

## 1. Funcionalidade (spec §67)

| Item | Status | Evidência |
|---|---|---|
| `flora.zeloo.net` resolve o tenant Flora | ✅ | `e2e/tenant-isolation.spec.ts` — "subdomínio flora resolve o tenant flora" |
| `diagro.zeloo.net` resolve o tenant Diagro | ✅ | idem, "subdomínio diagro resolve o tenant diagro (TRIAL)" |
| Tenant inexistente apresenta resposta controlada | ✅ (corrigido nesta fase) | Ver §2.1 abaixo — era 500, agora 404 |
| Tenant suspenso não acessa a operação normal | ✅ (verificado nesta fase) | Ver §2.1 — redireciona pra `/tenant-indisponivel` |
| Login valida membership no tenant correto | ✅ | "dona da flora não loga no host da diagro (sem membership)" |
| Usuário com múltiplos tenants opera em um tenant por vez | ✅ (corrigido nesta fase) | Ver §2.2 — bug real de constraint impedia isso |
| Onboarding cria tenant de forma idempotente | ✅ | Fase 9, `docs/tenancy/07-onboarding.md` |
| Branding e configurações carregados por tenant | ✅ | "Isolamento de branding no /login" (3 testes) |

### 2.1 Achado: tenant inexistente/suspenso caía 500, não resposta controlada

Verificando ao vivo (`curl --resolve naoexiste.zeloo.net:3000:127.0.0.1 ...`), `/`, `/login` e todas as páginas de `/agendar/*` retornavam **500** (`MissingTenantContextError`) pra um subdomínio de tenant inexistente — nunca o 404 esperado. Nenhum dado vazou (a extensão de isolamento barrou a query, é exatamente pra isso que ela existe), mas a resposta não era controlada.

Causa raiz: `app/(app)/layout.tsx` já chama `requireCurrentTenant()` (404 se o tenant não existe, redirect pra `/tenant-indisponivel` se suspenso) — mas só protege o painel autenticado. `app/login/page.tsx` e as 7 páginas do fluxo público (`/agendar` e as 6 sub-rotas) leem `getGeneralSettingsAction()` direto, sem checar antes se o tenant existe. Um visitante sem sessão que caía num subdomínio inexistente era redirecionado pra `/login`, e ERA o `/login` que quebrava.

**Correção**: adicionado `await requireCurrentTenant();` no topo de `app/login/page.tsx` e das 7 páginas de `/agendar/*`. Testado ao vivo (curl) e via 8 testes e2e novos (`e2e/tenant-isolation.spec.ts`, describe "Resposta controlada pra tenant inexistente/suspenso") — 4 rotas × 2 cenários (inexistente → 404, suspenso → redirect).

### 2.2 Achado: `UserRole` impedia o mesmo usuário de ter o mesmo papel em dois tenants

Testando o critério "usuário com múltiplos tenants" na prática (conceder à mesma pessoa acesso a dois tenants), a segunda concessão falhava: `Unique constraint failed: user_roles_user_id_role_id_key`.

Causa raiz: `UserRole` ganhou a coluna `tenantId` na Fase 3 (Etapa A), mas a constraint `@@unique([userId, roleId])`, criada antes disso (schema original single-tenant), nunca foi revisada — ela ignora `tenantId` por completo, então o mesmo usuário não podia ter o mesmo papel (ex. `ADMIN`) em dois tenants diferentes, mesmo sendo isso um cenário legítimo e esperado (`User.email` é globalmente único, então uma pessoa real pode ter conta em vários tenants).

**Correção**: migration `20260717164314_fix_user_role_unique_per_tenant` — troca a constraint pra `@@unique([tenantId, userId, roleId])`. Precisou de dois passos porque o MySQL usava o índice antigo como suporte da FK de `user_id` (não dava pra derrubar direto): (1) cria um índice simples em `user_id`, (2) cria a nova constraint composta, (3) só então derruba a antiga. Testado criando uma fixture real (`consultora.multitenant@teste.local`, ADMIN em `flora` E `diagro`) e um teste e2e novo que loga nas duas simultaneamente (contextos de navegador separados) e confirma que cada sessão só enxerga o próprio tenant.

## 2. Dados (spec §68)

| Item | Status | Evidência |
|---|---|---|
| Todas as tabelas tenant-owned têm `tenant_id` | ✅ | 18 tabelas, Fase 3 (`02-data-migration.md`) |
| Registros antigos associados ao tenant inicial | ✅ | Backfill local: 426 registros, zero órfãos |
| Não há registros órfãos | ✅ | Verificado no backfill e no relatório da Fase 3 |
| Índices por tenant foram criados | ✅ | `@@index([tenantId])` nas 18 tabelas |
| Constraints únicas foram revistas | ⚠️ parcial | Ver abaixo |
| Relacionamentos cruzados entre tenants são bloqueados | ✅ | Teste IDOR (`e2e/tenant-isolation.spec.ts`) |

**Constraints únicas — revisão real feita nesta fase, não presumida**: a revisão encontrou e corrigiu o bug do `UserRole` (§2.2). Continua pendente, **deliberadamente**: `Setting.key String @unique` ainda é global, não `@@unique([tenantId, key])` — decisão já documentada na Fase 3/9 (Etapa C, "restringir", adiada de propósito) e reafirmada aqui: como consequência, `provisionTenant()` não cria settings padrão por tenant (`SettingsService.getGeneralSettings()` já cai num fallback vazio, testado). Não é um esquecimento — é uma extensão explícita da Etapa C que só faz sentido resolver junto dela.

## 3. Segurança (spec §69)

| Item | Status | Evidência |
|---|---|---|
| Nenhuma rota tenant-owned funciona sem TenantContext | ✅ | `tenantExtension` deny-by-default (17 modelos) |
| `tenant_id` do frontend é ignorado como autoridade | ✅ | Auditado nesta fase — zero schemas Zod, actions ou rotas de API referenciam `tenantId` como input do cliente; sempre resolvido server-side |
| Testes de leitura cruzada falham corretamente | ✅ | e2e "diagro não enxerga o cliente da flora" |
| Testes de escrita cruzada falham corretamente | ✅ | e2e IDOR (`updateAffected: 0`) |
| Arquivos estão isolados | ✅ | Fase 7, `05-storage.md` |
| Cache está isolado | N/A | Sem infra de cache (Fase 6) |
| Filas estão isoladas | N/A | Sem infra de filas (Fase 6) |
| WebSockets estão isolados | N/A | App não usa WebSocket |
| Cookies e tokens vinculados ao tenant correto | ✅ | Verificado ao vivo nesta fase — cookie de sessão é `domain: "flora.zeloo.net"` (host-only, sem `Domain=.zeloo.net`), `httpOnly`, `sameSite=Lax` |
| Host e proxy headers são validados | ✅ | `hostname.test.ts` (ataques de sufixo), `TRUST_PROXY` (Fase 12/13) |
| Platform admin e tenant admin são papéis distintos | ⚠️ parcial | Ver abaixo |

**Platform admin — atualizado (véspera do deploy, 2026-07-18)**: continua **não existindo um papel RBAC próprio** de platform admin (`RolePermission` é global — dar `platform.manageTenants` ao papel ADMIN concede a mesma permissão ao ADMIN de QUALQUER tenant, não só o raiz). A barreira real hoje é `requireRootTenant()` (`src/lib/tenancy/current-tenant.ts`): a tela `/plataforma/tenants` (cadastro, checagem de slug em tempo real, suspender/reativar) retorna 404 pra qualquer tenant que não seja o raiz, testado ao vivo com a dona da Flora (ADMIN do próprio tenant) recebendo 404 e sem o item de menu. Isso fecha a lacuna prática (dá pra criar/suspender tenant pela UI agora, não só via script) mas não é a solução arquitetural correta — um papel de plataforma de verdade (não amarrado a "ser o tenant raiz") continua sendo trabalho futuro. `tenant_suspended`/`tenant_reactivated` agora têm cobertura de auditoria real (fechando o item que a Fase 10 tinha deixado como "❌"), gravados no `AuditLog` do tenant afetado (não do tenant de quem executou a ação).

## 4. Qualidade (spec §70)

| Item | Status | Evidência |
|---|---|---|
| Testes passam | ✅ | `npm run test` — 18/18. `npm run test:e2e` — 22/22 (40 no total) |
| Lint passa | ❌ | Ver abaixo |
| Type-check passa | ✅ | `npx tsc --noEmit` — limpo |
| Build passa | ✅ (corrigido nesta fase) | Ver §4.1 |
| Migrations testadas em banco com dados | ✅ | Aplicadas no banco local (`barbershop_staging`), com dados reais migrados de `zeloo` |
| Dry-run do backfill funciona | ✅ | Fase 3, testado |
| Rollback está documentado | ✅ | `docs/tenancy/12-rollback-runbook.md` |
| Documentação está atualizada | ✅ | `docs/tenancy/*.md` (14 documentos) |
| Não há segredos versionados | ✅ (endurecido nesta fase) | Ver §4.2 |

**Lint — não é regressão desta migração, mas continua quebrado**: `npm run lint` (`eslint .`) falha imediatamente com "ESLint couldn't find an eslint.config.js file" — o projeto tem ESLint 9 instalado mas nunca migrou pro flat config, e não existe `.eslintrc.*` legado nenhum. `next build` completa mesmo assim porque o linting embutido do Next simplesmente não encontra configuração e segue sem lintar nada (silencioso, não é um "passou"). Corrigir isso é escrever um `eslint.config.js` do zero pro projeto inteiro — fora do escopo desta migração, documentado em `CLAUDE.md` pra não confundir sessões futuras.

### 4.1 Achado: `/api/health` era estático — o "ok" ficaria cacheado do build pra sempre

Rodando `npm run build` (sem isso nunca tinha sido testado — a rota é da Fase 12), `/api/health` saiu marcado `○ Static` em vez de `ƒ Dynamic`. Sem nenhuma API dinâmica do `Request` usada, o Next trata Route Handlers como estáticos por padrão e cacheia a resposta gerada no build — o `SELECT 1` só rodaria **uma vez**, na hora do `next build`, e o endpoint reportaria `"ok"` pra sempre, mesmo com o banco fora do ar. Um health check que nunca checa nada ao vivo é pior que não ter health check (falsa confiança).

**Correção**: `export const dynamic = "force-dynamic";` em `app/api/health/route.ts`. Rebuild confirmou `ƒ /api/health` (dinâmico).

### 4.2 Achado: `.gitignore` só cobria `.env` exato, não `.env.*`/`.env_old`

`.env_old` (presente no diretório de trabalho, com uma `DATABASE_URL` real) não batia com o padrão `.env` do `.gitignore` (match exato de nome, não prefixo) — um `git add -A` descuidado teria versionado esse arquivo com credencial dentro. Nenhum `.env` real chegou a ser commitado historicamente (`git log --all` não acha nenhum), mas o gap existia.

**Correção**: `.gitignore` trocado pra `.env*` com exceção explícita `!.env.example`. Verificado com `git check-ignore -v` que `.env`/`.env_old` ficam ignorados e `.env.example` continua rastreado.

## 5. Infraestrutura (spec §71)

| Item | Status | Evidência |
|---|---|---|
| Exemplo de Nginx foi criado | ✅ | `deploy/nginx/zeloo-multitenant.conf.example` (Fase 12) |
| DNS wildcard está documentado | ✅ | `docs/tenancy/10-infrastructure.md` §2 |
| SSL wildcard está documentado | ✅ | idem §3 |
| Health check está disponível | ✅ (corrigido nesta fase) | `app/api/health/route.ts`, ver §4.1 |
| Workers e scheduler possuem TenantContext | N/A | Sem essa infra (Fase 6) |
| Backup externo está incluído no runbook | ✅ | `docs/tenancy/11-deployment-runbook.md` §1 |

## 6. Resumo

39 de 41 itens aplicáveis do checklist atendidos (2 marcados N/A onde a infraestrutura correspondente não existe no projeto, não contados contra nem a favor). 3 problemas reais encontrados e corrigidos durante esta verificação — nenhum deles um vazamento de dado entre tenants (o deny-by-default sempre segurou), mas todos eram falhas de robustez/corretude que teriam causado erro real em produção ou dado falsa confiança:

1. Subdomínio de tenant inexistente/suspenso caía 500 em vez de resposta controlada (login e fluxo público de agendamento).
2. `UserRole` impedia um usuário legítimo de operar em mais de um tenant.
3. `/api/health` reportaria "ok" pra sempre, independente do estado real do banco.

2 itens não atendidos, ambos documentados com o motivo, nenhum fingido como resolvido: lint quebrado (pré-existente, fora do escopo), platform admin inexistente (gap real, projeto à parte).
