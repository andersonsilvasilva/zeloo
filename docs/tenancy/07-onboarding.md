# Fase 9 — Onboarding comercial

> Depende de `docs/tenancy/01-architecture.md` (`Tenant`/`TenantUser`/`Plan`/`Subscription`, Fase 1), `02b-query-isolation.md` (extensão de isolamento, Fase 4), `06-branding-config.md` (`FeatureGate` sem assinatura real ainda). Testado só localmente — **produção não foi tocada**.

## 1. Serviço de provisionamento (spec §43)

`src/modules/tenancy/services/tenant-onboarding.service.ts` — `provisionTenant(input)`, transacional, na ordem do spec:

1. valida nome e slug (`tenantSlugSchema`, Fase 1 — reservados + formato);
2. confirma disponibilidade (busca por slug antes de criar);
3. cria tenant em `TRIAL` (`trialEndsAt` = +30 dias);
4. cria ou associa usuário proprietário (`findUnique` por e-mail — se já existe, reaproveita; senão cria com senha hasheada);
5. cria membership (`TenantUser`, `status: ACTIVE`);
6. atribui papel — **usa a role global `ADMIN`** (não existe uma role dedicada "tenant_owner" no catálogo deste projeto — ver §2 abaixo);
7. *(roles/permissions padrão)* — não precisa criar nada: `Role`/`Permission` já são catálogo global compartilhado desde a Fase 1;
8. *(dados iniciais)* — nenhum necessário além do acima;
9. cria `Subscription` (`TRIALING`) vinculada a um plano `trial` compartilhado (criado sob demanda, uma vez, reaproveitado por todos os tenants — nunca duplicado);
10. registra `AuditLog` (`action: "tenant_created"`);
11. retorna a URL do tenant (`https://{slug}.{APP_BASE_DOMAIN}`).

Erro em qualquer passo → rollback automático (tudo dentro de `$transaction`).

## 2. Por que a role é `ADMIN`, não "tenant_owner"

O catálogo de roles deste projeto (`ROLES` em `src/lib/auth/permissions.ts`) é `ADMIN, PROFESSIONAL, ATTENDANT, CASHIER, CLIENT` — não existe uma role "tenant_owner" distinta, e criar uma novidade só pra isso mudaria o RBAC existente sem necessidade (o spec pede "papel mais adequado", não literalmente esse nome). `ADMIN` já tem todas as permissões dentro do tenant, que é o que importa pra quem acabou de criar o próprio espaço.

## 3. Por que usa um `PrismaClient` cru, não o `@/lib/prisma` estendido

Conflito real encontrado ao implementar: a extensão de isolamento da Fase 4 **sempre sobrescreve** `tenantId` em toda escrita de modelo tenant-owned pelo tenant *da requisição atual* (`getCurrentTenant()`, resolvido pelo hostname). Provisionar é literalmente o ato de criar um tenant que ainda não existe — não há "tenant atual" fazendo sentido nesse momento, e mesmo que houvesse, seria o tenant errado (quem está criando `diagro` não está navegando em `diagro.zeloo.net`). Usar o client cru (mesmo padrão já usado em `prisma/tenancy-backfill.ts` e nos seeds) evita esse conflito — `tenantId` é setado manualmente em cada linha, correto por construção. Misturar client cru e estendido dentro da mesma transação não seria atômico (conexões diferentes), então a transação inteira usa o client cru.

## 4. Achado importante: `Setting.key` ainda bloqueia "configurações padrão" (spec §43 passo 6)

Tentei inicialmente criar linhas padrão em `Setting` (nome, timezone, bio) pro tenant novo — e achei uma colisão real: `Setting.key` continua `@unique` **global** (Etapa C, que trocaria pra `@@unique([tenantId, key])`, foi deliberadamente adiada desde a Fase 3). Criar uma linha `"barbershop.name"` pro tenant `diagro` colide com a linha que já existe pro tenant `zeloo`. Prefixar a key pra evitar a colisão quebraria a leitura normal (`SettingsRepository` busca pela key literal). **Decisão**: não criar linhas de configuração no provisionamento — `SettingsService.getGeneralSettings()` já trata ausência de qualquer chave com fallback vazio/padrão, então um tenant novo só vê campos em branco até preencher Configurações pela primeira vez. Comportamento aceitável, sem risco de colisão. Fica documentado como dependência real da Etapa C (que precisa acontecer antes de "configurações padrão automáticas" ser possível de verdade).

## 5. Idempotência (spec §44)

Chave natural: o **slug** já é `@unique`. Chamar `provisionTenant()` de novo com o mesmo slug não recria nada — encontra o tenant existente, retorna os mesmos IDs com `alreadyProvisioned: true`. Testado explicitamente (duas chamadas seguidas, mesmo `tenantId`/`ownerUserId` nas duas).

## 6. Testes realizados

Via `POST /api/tenant-debug` (extensão temporária da rota de diagnóstico da Fase 2, mesmo aviso de "sem auth, não deployar sem gate"):

| Teste | Resultado |
|---|---|
| Provisionar tenant novo (`diagro`) | ✅ Tenant criado em `TRIAL`, membership, `UserRole ADMIN`, `Subscription TRIALING`, `AuditLog` — tudo conferido direto no banco |
| Provisionar de novo (mesmo slug) | ✅ Idempotente — mesmos IDs, `alreadyProvisioned: true`, nada duplicado |
| Plano `trial` não duplica entre execuções | ✅ `count` = 1 mesmo após múltiplas chamadas |
| Dono recém-provisionado loga em `diagro.zeloo.net` | ✅ Sessão criada, sessão carrega o tenant certo (mesma validação da Fase 5) |

## 7. O que NÃO foi feito nesta fase (de propósito)

- **UI/formulário público de cadastro** — não existe página de "criar minha conta" nem fluxo de signup self-service. `provisionTenant()` é a peça de backend; expor isso como produto (marketing, formulário, verificação de e-mail, cobrança de verdade) é decisão comercial/de produto, fora do escopo de uma migração técnica multi-tenant. Hoje só é chamável via código/teste.
- **Configurações padrão automáticas** (nome/logo/timezone pré-preenchidos) — bloqueado pela constraint global de `Setting.key`, ver §4. Só é possível de verdade depois da Etapa C.
- **`FeatureGate` no menu** — continua sem uso real (adiado na Fase 8), mas agora pelo menos os tenants novos **já nascem com uma assinatura de verdade** (`trial`), então quando o menu for ligado ao `FeatureGate` (trabalho futuro, fora desta fase), tenants provisionados por aqui já vão funcionar corretamente — só os tenants antigos (`zeloo`, criados via backfill da Fase 3) ficariam sem assinatura até receberem uma manualmente.
- **Suspensão/reativação (spec §45)** — já é possível hoje via `Tenant.status` (é só o campo mudar; `requireCurrentTenant()` da Fase 8 já bloqueia acesso operacional de um tenant suspenso). Não foi criado nenhum fluxo/UI de administração pra fazer isso — hoje só via banco direto.
- **Exclusão e LGPD (spec §46)** — não implementado, nem estrutura preparada. Decisão explicitamente adiada — depende de política comercial/jurídica que não existe ainda. Documentado aqui só pra não ser esquecido, não pra fingir que foi resolvido.
- **Produção não foi tocada.**

## 8. Critério de conclusão

Provisionamento transacional, idempotente e testado de ponta a ponta (banco + login real do dono novo). Lacunas de produto (signup público, config automática, admin de suspensão, LGPD) documentadas como decisões pendentes de negócio/infra, não como esquecimento.
