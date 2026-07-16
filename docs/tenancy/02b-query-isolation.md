# Fase 4 — Isolamento obrigatório de consultas

> Depende de `docs/tenancy/00-audit.md`, `01-architecture.md`, `01b-tenant-resolver.md`, `02-data-migration.md`. Testado só localmente — **produção não foi tocada**.

## 1. Estratégia escolhida: extensão do Prisma Client

O spec (§25) sugere avaliar uma extensão do Prisma Client como mecanismo de isolamento centralizado. Esse projeto **já tinha uma extensão em produção** pra outro propósito — `src/lib/audit/audit-extension.ts`, que intercepta `$allModels.$allOperations` pra gravar log de auditoria. Segui exatamente esse padrão já estabelecido e validado em vez de inventar um mecanismo novo: `src/lib/tenancy/tenant-extension.ts`, encadeada em `src/lib/prisma.ts` logo depois da extensão de auditoria (`$extends(auditExtension).$extends(tenantExtension)`).

**Vantagem decisiva dessa abordagem**: como a interceptação acontece no nível do Prisma Client (não em cada repository/action individualmente), os **15 repositories e 96 Server Actions existentes não precisaram ser tocados um por um**. Qualquer código que já chama `prisma.client.findMany(...)`, `prisma.appointment.create(...)` etc. através do client compartilhado (`@/lib/prisma`) passa a ter isolamento automático, sem reescrever a query.

## 2. Por que não `AsyncLocalStorage` própria

O comentário já existente em `audit-extension.ts` documenta que uma tentativa anterior com `AsyncLocalStorage.enterWith()` falhava: o dataloader/batching interno do Prisma (`process.nextTick`) quebra a continuidade do `async_hooks` antes da query rodar de verdade. A solução que já funciona em produção nesse projeto é usar `headers()`/`auth()` do próprio Next.js, que usam o request-store interno do framework (imune a esse problema). `tenantExtension` reaproveita exatamente isso via `getCurrentTenant()` (`src/lib/tenancy/current-tenant.ts`, Fase 2) — mesma técnica, sem duplicar lógica.

## 3. Regra deny-by-default (spec §24)

`HARD_TENANT_MODELS` — as 17 tabelas tenant-owned que **exigem** tenant no contexto (as 18 tabelas da Etapa A, exceto `AuditLog`): toda operação de leitura ou escrita nesses modelos, sem tenant resolvido, lança `MissingTenantContextError` — nunca retorna "tudo" nem "nada" silenciosamente, sempre falha alto.

`SOFT_TENANT_MODELS` — só `AuditLog`: recebe `tenant_id` quando disponível, mas nunca bloqueia por falta dele (ações de plataforma, sem tenant, continuam válidas — decisão já registrada em `02-data-migration.md`).

## 4. Comportamento por tipo de operação

| Operação | O que a extensão faz |
|---|---|
| `findMany`, `findFirst(OrThrow)`, `findUnique(OrThrow)`, `count`, `aggregate`, `groupBy` | Mescla `tenantId` no `where` |
| `create` | Sobrescreve `data.tenantId` com o valor do contexto — **ignora qualquer tenantId vindo do chamador** (spec §26) |
| `createMany` | Mesmo, aplicado em cada item do array |
| `upsert` | `where.tenantId` mesclado (escopo do lookup) + `create.tenantId` sobrescrito |
| `update`, `updateMany`, `delete`, `deleteMany` | Mescla `tenantId` no `where` — impede alterar/apagar registro de outro tenant mesmo sabendo o ID |

`findUnique` com filtro extra (`tenantId` somado ao identificador único) é suportado nativamente pelo Prisma 5.x sem flag de preview — confirmado funcionando nos testes abaixo.

## 5. Efeito colateral encontrado e corrigido: build quebrava

Ativar a extensão quebrou o `next build`: páginas públicas do fluxo de agendamento (`/agendar/confirmar`, `/agendar/horario`, `/agendar/identificacao`, `/agendar/profissional`, `/agendar/sucesso`) e o layout raiz (`generateMetadata` em `app/layout.tsx`) leem `Setting` (agora um `HARD_TENANT_MODEL`) durante a geração estática do build — momento em que não existe requisição real, logo nenhum tenant é resolvido, logo `MissingTenantContextError` é lançado, e o Next não consegue pré-renderizar essas rotas.

**Correção**: as 5 páginas de `/agendar/*` ganharam `export const dynamic = "force-dynamic"` (mesmo padrão já usado e aprovado nesta VPS para `/agendar` e `/agendar/escolher`, ver `00-audit.md` §4 e a memória do projeto sobre a armadilha #5 de deploy). O layout raiz ganhou um fallback (`getSettingsOrFallback()`) que captura o erro e usa metadata genérica — evita que a única página realmente estática do app (`/_not-found`) quebre o build inteiro por causa de metadata.

## 6. Testes de isolamento realizados

Criado um segundo tenant local só pra teste (`flora`, com um cliente `"Cliente Secreto da Flora"`), via Prisma Client **não-estendido** (bypassa a extensão de propósito, só pra montar o cenário) — dados reais de produção continuam intocados, isso é 100% local.

Testado via `app/api/tenant-debug` (GET, com `?probeClientId=` pra testar acesso direto por ID) batendo com `Host: zeloo.net` / `Host: flora.zeloo.net` / `Host: app.zeloo.net`:

| Cenário | Resultado |
|---|---|
| Listagem de clientes como `zeloo` | 16 clientes, todos da `zeloo`, "Cliente Secreto da Flora" **não aparece** |
| Listagem de clientes como `flora` | 1 cliente — só o da `flora` |
| `flora` tentando `findUnique` num cliente da `zeloo` por ID direto | não encontrado (`foundViaFindUnique: false`) |
| `flora` tentando `updateMany` num cliente da `zeloo` por ID direto | 0 linhas afetadas |
| `zeloo` tentando acessar cliente da `flora` por ID direto | mesmo resultado, na direção oposta |
| Domínio central (`app.zeloo.net`, sem tenant) tentando listar clientes | `MissingTenantContextError` — falha alta, zero dado retornado |

Confirma: isolamento de leitura, proteção contra acesso direto por ID (IDOR) em leitura e escrita, e a regra deny-by-default — nas duas direções e sem contexto nenhum.

## 7. Regressão

15 páginas principais autenticadas (dashboard, agenda, clientes, profissionais, serviços, financeiro, contas a pagar/receber, comissões, mensagens, usuários, relatórios, configurações, balancete, fechamento mensal) + fluxo público `/agendar` testados via Playwright depois da extensão ativa — todas OK, sem erro de aplicação na tela, sem HTTP 5xx. Únicos console errors são 404 de recursos (imagens ausentes), pré-existentes e não relacionados.

## 8. O que NÃO foi feito nesta fase (de propósito)

- **Relacionamentos cruzados (spec §27)**: a extensão garante isolamento por linha (nenhuma query cruza tenant), mas **não valida ainda** que, ao vincular um agendamento, `appointment.tenantId == client.tenantId == professional.tenantId == service.tenantId`. Hoje isso não é um risco de vazamento (a extensão já impede ler/escrever entidades de outro tenant), mas um bug de aplicação *dentro* do mesmo tenant não seria pego por essa camada. Validação de relacionamento é trabalho de serviço, não de repository/Prisma — fica pra quando os services forem revisados individualmente.
- **Rotas administrativas de plataforma (spec §28)**: não existem ainda (Fase 9 — onboarding).
- **Produção não recebeu nada desta fase.** A extensão só está ativa localmente. Ativar em produção exige que a Fase 3 (Etapas A+B) já tenha rodado lá primeiro — **sem isso, a regra deny-by-default faria toda leitura/escrita tenant-owned falhar em produção**, porque nenhuma linha teria `tenant_id` preenchido e nenhum registro em `tenants` existiria ainda.
- Tenant de teste `flora` e o cliente fictício continuam no banco **local** (não afeta produção) — útil pra testes futuros de isolamento, removível quando não for mais necessário.

## 9. Critério de conclusão

Mecanismo de isolamento implementado e comprovadamente funcional (leitura, escrita, IDOR, deny-by-default) contra dados reais migrados localmente, sem regressão em nenhuma tela do app. Validação de relacionamentos cruzados e rotas administrativas ficam pra fases seguintes, registradas como pendência — não "esquecidas".
