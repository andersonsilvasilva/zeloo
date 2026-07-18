# Fase 10 — Observabilidade e auditoria

> Depende de `docs/tenancy/02b-query-isolation.md` (extensão de auditoria já existente, `src/lib/audit/audit-extension.ts`). Testado só localmente — **produção não foi tocada**.

## 1. Achado sério corrigido: vazamento de segredos no audit log (spec §47)

Auditando a extensão de auditoria existente, encontrei um problema real: ela grava o `oldValues`/`newValues` **completo** de toda escrita nos modelos auditados — incluindo `User.passwordHash` (hash bcrypt, não a senha em texto puro, mas ainda assim não deveria estar num log secundário) e `Setting.value` quando a linha é `mercadopago.access_token`/`mercadopago.webhook_secret` (esse sim, em **texto puro** — token de API de verdade).

**Correção**: `redactSensitive(model, row)` em `audit-extension.ts` — substitui por `"[REDACTED]"` antes de serializar:
- `User.passwordHash` sempre.
- `Setting.value` quando `key` é uma das chaves sensíveis (`SETTINGS_KEYS.mercadoPagoAccessToken`/`mercadoPagoWebhookSecret`, reaproveitado do módulo settings — não uma lista duplicada).

Testado via update real nos dois casos: `passwordHash` e `value` do token aparecem como `"[REDACTED]"` no `AuditLog` gravado, todos os outros campos continuam normais.

## 2. `role_changed` — `UserRole` não era auditado

`UserRole` (atribuição/remoção de papel — item explícito da lista do spec §49) não estava em `AUDITED_MODELS`. Adicionado.

## 3. `login`/`logout` — não existiam de jeito nenhum

Sessão é JWT (Fase 5) — não passa por nenhuma escrita de modelo que a extensão de auditoria pudesse interceptar sozinha. Adicionados `events.signIn`/`events.signOut` em `src/lib/auth/auth.ts`, gravando `AuditLog` explicitamente (`action: "login"|"logout"`, `entity: "User"`). `tenantId` não é setado manualmente — a extensão de isolamento já injeta o tenant da requisição atual em toda escrita de `AuditLog` (mesmo padrão do resto da auditoria), e login/logout sempre acontecem no host do próprio tenant, então dá no mesmo.

Testado via login+logout reais: as duas linhas de `AuditLog` aparecem com `tenantId`/`userId`/IP/user-agent corretos.

## 4. Cobertura atual de "ações críticas" (spec §49)

| Ação da lista do spec | Coberta? | Como |
|---|---|---|
| `login` / `logout` | ✅ (nova) | `events.signIn`/`signOut` |
| `tenant_created` | ✅ (Fase 9) | `provisionTenant()` grava explicitamente |
| `tenant_suspended` | ❌ | não existe fluxo de suspensão via app ainda (só direto no banco, Fase 8) |
| `user_invited` | N/A | não existe fluxo de convite — usuários são criados diretamente |
| `role_changed` | ✅ (nova) | `UserRole` agora auditado |
| `customer_exported` | N/A | não existe funcionalidade de exportação de clientes |
| `payment_created` / `payment_cancelled` | ✅ (já existia) | `Payment` já era auditado |
| `settings_changed` | ✅ (já existia) | `Setting` já era auditado |
| `integration_changed` | ✅ (já existia, agora sem vazar segredo) | `Setting` (chaves do Mercado Pago) |

## 5. O que NÃO foi feito nesta fase (de propósito)

- **Logs estruturados de requisição HTTP** (spec §47 — `request_id`, `http_method`, `path`, `status_code`, `duration_ms` por requisição): o projeto não tem nenhuma infraestrutura de logging estruturado (sem Winston/Pino, só `console.log`/`console.error` pontuais). Construir isso do zero é um projeto de observabilidade próprio, maior que o escopo desta migração — o `AuditLog` já cobre a parte mais importante pra multi-tenant (que ação de negócio aconteceu, em qual tenant, por quem), que é o que a Fase 4-9 já garantem estar sempre correto.
- **Métricas por tenant** (spec §48 — requisições, erros, latência, uso de recursos): mesma situação, zero infraestrutura de métricas hoje (sem Prometheus/APM). Documentado como trabalho futuro; a lista de métricas do spec já é um bom ponto de partida quando essa infra existir.
- **Produção não foi tocada.**

## 6. Critério de conclusão

O buraco de segurança real (segredos em texto puro no audit log) foi encontrado e corrigido, testado. Cobertura de auditoria de ações críticas ampliada (login/logout/role_changed). Logs estruturados e métricas ficam registrados como trabalho de observabilidade mais amplo, não específico desta migração — não fingido como resolvido.
