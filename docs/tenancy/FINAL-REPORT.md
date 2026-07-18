# Relatório final — Migração multi-tenant por subdomínio (Zeloo.net)

> Branch `feat/multi-tenancy-subdomains`, Fases 0-16 do plano em `CLAUDE_CODE_MULTI_TENANT_ZELOO.md`, executadas entre 2026-07-15 e 2026-07-17. **Tudo local. Produção não foi tocada em nenhum momento**, exceto por um backup de segurança feito antes de começar (dump completo + tag git `pre-multi-tenant-2026-07-16`). Este documento não declara nada sobre DNS, SSL ou produção que não tenha sido verificado ao vivo.

## 1. Stack identificado

Next.js 14.2.35 (App Router), React, TypeScript 5.5, Prisma 5.18.0 (MySQL 8, `engineType = "binary"`), Auth.js v5 beta (Credentials, sessão JWT), Zod, Tailwind CSS, Vitest 4.1.10 + Playwright 1.61.1 (ambos configurados nesta migração — o projeto não tinha test runner nenhum antes). Deploy manual (não git-based) numa VPS dedicada (Ubuntu 22.04, PM2 + Nginx). Ver `CLAUDE.md` (também criado nesta sessão) pra arquitetura geral do projeto fora do escopo de tenancy.

## 2. Arquitetura implementada

Isolamento por **subdomínio** (`<slug>.zeloo.net`), com o tenant `zeloo` (dados reais migrados) servido no **domínio raiz** (decisão de negócio confirmada na Fase 0 — `app.zeloo.net` fica reservado pra um futuro login central, nunca implementado nesta migração).

- **Resolução em duas camadas**: `middleware.ts` (Edge Runtime, sem Prisma) faz parsing puro de hostname (`src/lib/tenancy/hostname.ts`) e injeta headers; `src/lib/tenancy/current-tenant.ts` (Node, `React.cache()`) faz o lookup real no banco a partir desses headers.
- **Isolamento de dados via Prisma Client Extension** (`src/lib/tenancy/tenant-extension.ts`): deny-by-default — 17 modelos "hard" lançam `MissingTenantContextError` se não há tenant resolvido; `AuditLog` é "soft" (anexa quando disponível, nunca bloqueia). Composta com a extensão de auditoria pré-existente (`tenant` por fora, `audit` por dentro — ver `src/lib/prisma.ts`).
- **Migração de dados expand-then-restrict**: `tenant_id` nullable + índice em 18 tabelas (Etapa A) + backfill idempotente (Etapa B). **Etapa C (restringir/tornar obrigatório) deliberadamente NÃO aplicada** — ver §16.
- **Autenticação por tenant**: login resolve o tenant pelo hostname da própria requisição (nunca de um campo do formulário), valida membership (`TenantUser`) e status (`ACTIVE`/`TRIAL`), JWT carrega `tenantId`/`tenantSlug`, layout autenticado faz cross-check a cada requisição.
- **Feature flag de ativação** (`MULTITENANCY_ENABLED`, Fase 13): desligada, todo tráfego opera como o tenant raiz independente do hostname — permite deployar o código pronto sem depender de DNS/SSL wildcard. Ligar depois é só uma troca de env var.
- **Storage e mensageria** isolados por `tenants/{tenantId}/...` no path de upload; sem infraestrutura de cache/filas/scheduler no projeto (documentado como N/A, não fingido como resolvido).
- **Onboarding** (`provisionTenant()`) transacional e idempotente (chave natural = slug), usando `PrismaClient` cru pra não colidir com a extensão de isolamento.

Documentação fase a fase completa em `docs/tenancy/00-audit.md` até `13-acceptance-criteria.md` (14 documentos) — cada um com o que foi feito, testado (com resultado real) e deliberadamente não feito.

## 3. Arquivos criados (44)

Módulo de tenancy completo (`src/lib/tenancy/*`, `src/modules/tenancy/*`), infraestrutura de teste (`vitest.config.mts`, `playwright.config.ts`, `e2e/tenant-isolation.spec.ts`, `src/lib/tenancy/hostname.test.ts`), rota de diagnóstico (`app/api/tenant-debug/route.ts`, sem autenticação, só local), health check (`app/api/health/route.ts`), página `/tenant-indisponivel`, scripts de migração de dados (`prisma/tenancy-backfill.ts`, `prisma/tenancy-storage-migrate.ts`), 3 migrations, exemplo de Nginx (`deploy/nginx/zeloo-multitenant.conf.example`), 14 documentos em `docs/tenancy/`, e `CLAUDE.md` na raiz. Lista completa: `git diff --name-status main..HEAD` (branch atual).

## 4. Arquivos modificados (23)

Entre os mais significativos: `middleware.ts` (tenant resolver + flag de ativação), `prisma/schema.prisma` (7 tabelas novas + `tenantId` em 18 + fix de constraint), `app/(app)/layout.tsx` (liga `requireCurrentTenant()`), `src/lib/auth/{auth.ts,auth.config.ts}` (login por tenant, redirect por host, eventos de audit), `src/lib/prisma.ts` (encadeia a extensão de tenant), `src/lib/audit/audit-extension.ts` (redação de segredos), `src/lib/storage/local-storage-provider.ts` (path por tenant), `app/login/page.tsx` + as 7 páginas de `/agendar/*` (branding por tenant + resposta controlada pra tenant inexistente), `prisma/seed.ts`/`seed-demo.ts` (adaptados à nova constraint), `.gitignore` (`.env*` endurecido).

## 5. Migrations criadas (3)

| Migration | O que faz |
|---|---|
| `20260716142035_add_tenancy_global_models` | Cria 7 tabelas novas: `Tenant`, `TenantUser`, `Plan`, `PlanFeature`, `Subscription`, `TenantLimit`, `UsageRecord`. Puramente aditiva. |
| `20260716154248_tenancy_expand_add_tenant_id` | `tenant_id` NULLABLE + índice + FK (`ON DELETE SET NULL`) em 18 tabelas existentes. Puramente aditiva — nenhum dado existente é alterado ou removido. |
| `20260717164314_fix_user_role_unique_per_tenant` | Corrige `UserRole` de `@@unique([userId, roleId])` pra `@@unique([tenantId, userId, roleId])` — achado real da Fase 14 (impedia um usuário de operar em mais de um tenant). |

Nenhuma migration de restrição (Etapa C) existe ainda — ver §16.

## 6. Tabelas alteradas

`account_entries`, `appointments`, `audit_logs`, `cash_register_closings`, `cash_registers`, `cashbook_entries`, `clients`, `commission_closings`, `media`, `message_logs`, `message_templates`, `payments`, `pix_charges`, `professionals`, `recurring_account_entries`, `services`, `settings`, `user_roles` (18 tabelas, todas com `tenant_id` nullable + índice + FK).

## 7. Estratégia de backfill

`prisma/tenancy-backfill.ts` — idempotente via `WHERE tenant_id IS NULL` (natural key, não uma tabela de idempotência dedicada), suporta `--dry-run`/`--apply`, transacional, relatório por tabela. Testado localmente: 426 registros migrados pro tenant `zeloo`, **zero órfãos** confirmado. Não roda automaticamente — é um passo explícito do runbook de deploy (`11-deployment-runbook.md`), a ser executado contra o banco de produção só quando o usuário decidir fazer o deploy.

## 8. Testes criados

**40 testes automatizados**, projeto não tinha nenhum antes desta migração:

- **Vitest** (`npm run test`) — 18 testes unitários, `src/lib/tenancy/hostname.test.ts` (resolução de hostname, ataques de sufixo, normalização, trust-proxy).
- **Playwright** (`npm run test:e2e`) — 22 testes e2e, `e2e/tenant-isolation.spec.ts`, contra servidor real: resolução de hostname (3), isolamento de dados + IDOR (4), isolamento de branding (3), isolamento de autenticação (3), usuário com múltiplos tenants (1), resposta controlada pra tenant inexistente/suspenso (8).

Todos passando na verificação final desta sessão (§10).

## 9. Comandos executados (verificação final desta sessão)

```bash
npx tsc --noEmit          # type-check
npm run test               # Vitest
npm run test:e2e            # Playwright
npm run build                # build de produção
npm run prisma:seed          # smoke test do seed base
npm run prisma:seed:demo      # smoke test do seed de demonstração
npx prisma migrate status      # confirma banco local em dia com as migrations
```

## 10. Resultados de lint, type-check, testes e build

| Comando | Resultado |
|---|---|
| `npx tsc --noEmit` | ✅ Limpo (achou e corrigiu 2 erros reais durante a Fase 15, ver `13-acceptance-criteria.md`) |
| `npm run test` | ✅ 18/18 |
| `npm run test:e2e` | ✅ 22/22 |
| `npm run build` | ✅ Compila, gera as 32 rotas, sem erros |
| `npm run lint` | ❌ **Quebrado** — `eslint.config.js` não existe (ESLint 9 instalado, projeto nunca migrou pro flat config). **Pré-existente, não é regressão desta migração.** Ver `CLAUDE.md` e `13-acceptance-criteria.md`. |

## 11. Riscos remanescentes

1. **Etapa C nunca aplicada** — `tenant_id` continua nullable em produção até essa migration ser feita à parte (não faz parte deste deploy). Enquanto isso, `Setting.key` continua globalmente único (não `@@unique([tenantId, key])`), então tenants novos não têm settings padrão próprias (caem no fallback vazio, já testado).
2. **`app/api/tenant-debug`** é uma rota de diagnóstico sem autenticação. Documentada como "local-only" em todo lugar, mas **precisa de um gate** (ou remoção) antes de qualquer deploy real — nada no código impede que ela suba junto se o deploy for feito sem essa checagem manual.
3. **Nenhum certificado SSL wildcard existe** — sem ele, subdomínios de tenant são inacessíveis via HTTPS em produção (mitigado pelo flag `MULTITENANCY_ENABLED`, que evita esse problema até a infra estar pronta — ver §14).
4. **Lint continua quebrado** (pré-existente) — regressões de estilo/qualidade não são pegas automaticamente até alguém escrever um `eslint.config.js`.
5. **Nenhum papel de "platform admin"** existe — suspender um tenant hoje só é possível direto no banco.
6. **Backup automatizado recorrente não existe** — só o backup pontual de pré-migração. Runbook de deploy exige backup manual antes de qualquer aplicação de migration em produção.
7. ~~`create()` com relação aninhada quebrava a injeção de `tenantId`~~ — **encontrado e corrigido depois deste relatório ter sido escrito pela primeira vez**, durante teste manual do usuário (criar Serviço com modelo de mensagem, ou Conta a Receber com cliente vinculado, falhava com `PrismaClientValidationError`). Ver `docs/tenancy/02b-query-isolation.md` §10. Fica registrado aqui como lição: **os testes automatizados desta migração não cobriam a forma dos payloads de escrita dos módulos de negócio já existentes** (só escalar vs. com relação aninhada) — vale considerar uma varredura futura por outros `create()`/`upsert()` em modelos tenant-owned que ainda não passaram por teste nenhum depois da ativação da extensão.

## 12. Ações manuais na VPS (fora do alcance desta sessão)

Nenhuma foi executada — lista do que precisa ser feito manualmente quando o deploy for autorizado:

1. Registro DNS `A * → 179.197.71.82` (wildcard) no provedor de DNS de `zeloo.net`.
2. Emissão de certificado SSL wildcard via DNS-01 (`docs/tenancy/10-infrastructure.md` §3) — decisão de plugin/provedor pendente, nenhum token de API foi gerado ou solicitado.
3. Atualizar `/etc/nginx/sites-available/barbearia` pra `server_name zeloo.net *.zeloo.net;` (exemplo pronto em `deploy/nginx/zeloo-multitenant.conf.example`).
4. Backup completo (banco + uploads) antes de qualquer migration em produção — checklist em `11-deployment-runbook.md` §1.
5. Aplicar as 3 migrations novas + rodar o backfill (`--dry-run` antes de `--apply`) contra o banco de produção.
6. Criar a linha `Tenant` do `zeloo` em produção (não existe ainda — só existe local).

## 13. Variáveis de ambiente necessárias

Novas desde esta migração (ver `.env.example` completo):

| Variável | Produção (Release A) | Produção (Release B, depois da Fase 12 pronta) |
|---|---|---|
| `MULTITENANCY_ENABLED` | `"false"` (ou ausente) | `"true"` |
| `APP_BASE_DOMAIN` | `"zeloo.net"` | igual |
| `TENANCY_MODE` | `"subdomain"` | igual |
| `ROOT_TENANT_SLUG` | `"zeloo"` | igual |
| `DEFAULT_TENANT_SLUG` | `""` | igual |
| `CENTRAL_DOMAINS` | `"zeloo.net,www.zeloo.net,app.zeloo.net,admin.zeloo.net,api.zeloo.net"` | igual |
| `TRUST_PROXY` | `"false"` | `"false"` (nunca muda — ver `10-infrastructure.md` §5) |
| `TENANT_CACHE_PREFIX` / `TENANT_STORAGE_PREFIX` | `"tenant"` / `"tenants"` | igual |
| `AUTH_TRUST_HOST` | `"true"` (já é o valor de produção hoje) | igual |

## 14. Ordem exata de deploy

Detalhada com comandos reais em `docs/tenancy/11-deployment-runbook.md`. Resumo:

1. Backup completo verificável (banco + uploads, checksum, fora da VPS) — `11-deployment-runbook.md` §1.
2. Build local + empacotamento (sem `.env*`, sem `public/uploads`) + extração na VPS.
3. `prisma migrate deploy` (aplica as 3 migrations novas).
4. Criar a linha `Tenant` do `zeloo` em produção.
5. Backfill: `--dry-run` primeiro, conferir, depois `--apply`.
6. Migração de storage (`tenancy:storage-migrate`).
7. Validação (zero órfãos).
8. `MULTITENANCY_ENABLED="false"` no `.env` da VPS + `pm2 restart --update-env` (Release A — comportamento idêntico ao atual pro usuário final).
9. Health check + smoke test manual.
10. **Só depois**, quando a Fase 12 (DNS/SSL/Nginx wildcard) estiver pronta e validada: trocar o flag pra `"true"` + restart (Release B).

## 15. Procedimento de rollback

Detalhado em `docs/tenancy/12-rollback-runbook.md`, em camadas (do mais barato ao mais destrutivo):

1. Desligar `MULTITENANCY_ENABLED` (reversível, instantâneo, não destrutivo).
2. Reverter o build/código pro pacote anterior (se o problema for do código, não da ativação).
3. Reverter as migrations (aditivas, seguro — mas **nunca remover `tenant_id` sem confirmar que nenhum tenant real foi criado**, spec §65).
4. Restaurar banco do backup (último recurso, descarta dados posteriores ao backup).
5. Restaurar uploads do backup.
6. Verificação de integridade pós-rollback (health check + contagens batendo com o backup).

## 16. Itens ainda não implementados e motivo

| Item | Motivo |
|---|---|
| Etapa C (restringir `tenant_id`, tornar obrigatório) | Deliberadamente adiada desde a Fase 3 — precisa de uma janela própria de validação em produção com o backfill já confirmado, spec não pede antecipar isso antes dos testes (spec §72, "não antecipe a migration de restrição") |
| `Setting.key` por tenant (`@@unique([tenantId, key])`) | Consequência direta da Etapa C não aplicada — settings padrão por tenant ficam pendentes junto |
| DNS wildcard, SSL wildcard, Nginx `server_name *.zeloo.net` | Infraestrutura real da VPS, fora do alcance desta sessão (sem acesso ao provedor de DNS) — documentado com instruções exatas, nada executado |
| Gate/remoção de `app/api/tenant-debug` | Rota de diagnóstico útil durante toda a migração; **precisa** ser resolvida antes de deploy real, não foi porque ainda está em uso ativo pro desenvolvimento local |
| `eslint.config.js` | Pré-existente ao início desta migração (ESLint 9 nunca migrado do formato antigo) — não é uma regressão introduzida aqui, mas também não foi corrigido: é um projeto de qualidade à parte, não de tenancy |
| Papel de "platform admin" | Nunca existiu no projeto; suspender/gerenciar tenants hoje só é possível direto no banco. Ferramental de administração da plataforma é um projeto próprio, fora do escopo desta migração |
| Backup automatizado recorrente (cron) | Só existe o backup pontual de pré-migração; agendamento automático fica como pendência operacional pra quando o deploy acontecer |
| Cache, filas, scheduler, WebSocket por tenant | N/A — o projeto não tem nenhuma dessas infraestruturas hoje, documentado como tal desde a Fase 6, não fingido como implementado |

---

**Resumo em uma frase**: o código está pronto e testado localmente (40 testes, build limpo, 3 bugs reais encontrados e corrigidos durante a própria verificação de aceite) pra um deploy em duas etapas — Release A (comportamento idêntico ao atual, dados já preparados) seguido de Release B (ativação de subdomínios, só depois da infraestrutura de DNS/SSL existir) — e nada disso foi para produção.
