# Fase 8 — Branding e configurações por tenant

> Depende de `docs/tenancy/00-audit.md`, `02b-query-isolation.md` (`Setting` já é `HARD_TENANT_MODEL`), `01-architecture.md` (`Plan`/`PlanFeature`/`FeatureGate`, Fase 1). Testado só localmente — **produção não foi tocada**.

## 1. Configurações já são por tenant — sem duplicação necessária (spec §41)

O spec sugere um JSON conceitual de branding/módulos. Este projeto já tem `Setting` (key-value: nome, logo, favicon, og-image, endereço, timezone, redes sociais, credenciais Mercado Pago) — e desde a Fase 3/4, `Setting` **já é tenant-owned e isolado automaticamente** pela extensão do Prisma. Duplicar esses dados em `Tenant.settings` (o campo `Json?` criado na Fase 1) criaria duas fontes de verdade pra mesma informação. Decisão: **`Setting` continua sendo o armazenamento de configuração/branding por tenant** — `Tenant.settings` fica reservado pra metadados de plataforma que não fazem sentido no modelo key-value do tenant (nada usa esse campo ainda; não é uma lacuna, é intencional).

## 2. Sem risco de HTML/CSS arbitrário (spec §41)

Auditado `generalSettingsSchema` (`src/modules/settings/schemas/settings.schema.ts`): todo campo é string simples com `max()`, ou validado como e-mail/URL via Zod — nenhum campo aceita HTML/CSS. Confirmado também que `dangerouslySetInnerHTML` não é usado em lugar nenhum do projeto (`grep` zero resultados) — não existe caminho de renderização que interpretaria esses valores como marcação.

**Nota**: o JSON conceitual do spec inclui `branding.primaryColor`/`secondaryColor` (tema de cor por tenant) — este projeto não tem essa funcionalidade (UI usa um tema fixo). Adicionar theming por tenant seria uma feature de produto nova, não uma tarefa de isolamento multi-tenant — fora do escopo desta migração.

## 3. Tenant suspenso/inexistente tratado de verdade (spec §18, §42)

`requireCurrentTenant()` existia desde a Fase 2 mas **nunca tinha sido chamado por nenhuma rota real** (documentado como pendência em `01b-tenant-resolver.md` e `03-auth-sessions.md`). Agora `app/(app)/layout.tsx` usa essa função: 404 se o hostname não resolve tenant nenhum, redireciona pra `/tenant-indisponivel` (página nova, antes inexistente apesar de já ser referenciada) se `SUSPENDED`/`CANCELLED`.

Cenário testado: login válido → tenant suspenso *depois* da sessão já criada (situação realista: suporte suspende a conta enquanto o usuário está logado) → próxima navegação é redirecionada pra `/tenant-indisponivel` com mensagem clara, não pra `/login` (que seria um beco sem saída confuso, já que login também bloqueia tenant suspenso desde a Fase 5).

`/tenant-indisponivel` é deliberadamente **sem nenhuma consulta ao banco** — mensagem genérica, sem depender de branding do próprio tenant (que pode não fazer sentido mostrar numa conta suspensa) e sem risco de a própria página de erro falhar por falta de contexto.

## 4. Frontend consome tenant via bootstrap server-side (spec §42)

Já era assim antes desta fase, confirmado nesta auditoria: nome/logo vêm de `getGeneralSettingsAction()` chamado no layout (Server Component), nunca de `tenant_id` enviado pelo cliente como fonte de autoridade — o tenant sempre é resolvido a partir do hostname (Fase 2) ou da sessão validada (Fase 5), nunca de input do usuário.

## 5. localStorage — não se aplica

`grep -r localStorage src/` não encontra nenhum uso no projeto — não há chave de cache local pra namespacear por tenant.

## 6. O que NÃO foi feito nesta fase (de propósito)

- **Ocultar módulos por plano no menu (spec §42, "módulos")** — **adiado pra Fase 9**. O `FeatureGate` (Fase 1) já existe e funciona, mas nenhum tenant tem `Subscription`/`Plan` atribuído ainda (o backfill da Fase 3 só cria `Tenant`+`TenantUser`, não assinatura). Ligar `FeatureGate.isEnabled()` no menu agora faria **todo módulo desaparecer** pra `zeloo` e `flora` (sem assinatura ativa = `false` em tudo) — quebraria o uso real da aplicação hoje. A Fase 9 (onboarding e planos) é o lugar certo pra isso, quando tenants passarem a ter um plano de verdade desde a criação.
- **Theming por tenant** (cores primária/secundária) — feature de produto nova, não faz parte do escopo de isolamento multi-tenant.
- **Produção não foi tocada.**

## 7. Critério de conclusão

Configuração/branding já é por tenant (herdado das Fases 3/4, confirmado sem duplicação nem risco de injeção). Tenant suspenso/inexistente agora tem tratamento real e testado, fechando uma lacuna aberta desde a Fase 2. Ocultação de módulos por plano fica formalmente registrada como trabalho da Fase 9, não esquecida.
