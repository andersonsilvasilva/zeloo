# Fase 3 — Migração de banco sem perda de dados (Etapas A e B)

> Depende de `docs/tenancy/00-audit.md`, `01-architecture.md`, `01b-tenant-resolver.md`. Testado só localmente — **produção não foi tocada nesta fase**. Etapa C (Restringir) não foi feita — ver §5.

## 1. Estratégia: expandir → migrar → restringir (spec §19)

Esta fase cobriu as duas primeiras etapas:

- **Etapa A — Expandir**: `tenant_id` nullable + índice em todas as 18 tabelas tenant-owned identificadas em `00-audit.md` §11. Migration puramente aditiva (`ADD COLUMN ... NULL`, `CREATE INDEX`) — sem `DROP`, sem `MODIFY`, sem `NOT NULL`. Verificado por grep antes de aplicar.
- **Etapa B — Migrar**: comando de backfill idempotente (`prisma/tenancy-backfill.ts`, spec §20) que cria o tenant "zeloo" e preenche `tenant_id` em todos os registros existentes + associa todos os usuários atuais via `TenantUser`.
- **Etapa C — Restringir**: **não feita nesta fase** — ver §5.

## 2. Tabelas alteradas (Etapa A)

Todas ganharam `tenant_id String? @map("tenant_id")` + relação `Tenant?` (`onDelete: SetNull`) + `@@index([tenantId])`:

`user_roles`, `clients`, `professionals`, `services`, `appointments`, `payments`, `pix_charges`, `cashbook_entries`, `cash_registers`, `cash_register_closings`, `recurring_account_entries`, `account_entries`, `commission_closings`, `message_templates`, `message_logs`, `media`, `settings`, `audit_logs`.

Migration: `prisma/migrations/20260716154248_tenancy_expand_add_tenant_id/migration.sql`. Aplicada **só no banco local** (`barbershop_staging`).

Constraints únicas existentes (`Service.slug`, `Setting.key`) **não foram alteradas** — continuam globais nesta fase, de propósito (mudar pra `@@unique([tenantId, slug])` exige que todo registro já tenha `tenant_id`, o que só é garantido depois da Etapa B rodar — e mesmo assim isso é trabalho da Etapa C).

## 3. Comando de backfill (Etapa B)

`prisma/tenancy-backfill.ts`, rodado via `npm run tenancy:backfill -- --slug=<slug> --name="<nome>" --dry-run|--apply`.

Características (conforme spec §20):
- `--dry-run` obrigatório antes de `--apply` (o script recusa rodar sem exatamente um dos dois).
- Idempotente: usa `upsert` pro tenant e memberships, `UPDATE ... WHERE tenant_id IS NULL` pras tabelas — rodar de novo depois de aplicado não duplica nada, só reporta 0 linhas afetadas.
- Transação única no modo `--apply` — se qualquer parte falhar, nada é gravado.
- Relatório por tabela, antes e depois (total / sem tenant / atualizados).
- Nunca escolhe slug sozinho (`--slug` sempre obrigatório, sem default).
- Valida o slug (formato + lista de reservados, reaproveitando `tenantSlugSchema` da Fase 1) antes de qualquer coisa.
- Aborta (exit 1) se, depois do backfill, sobrar algum registro sem `tenant_id` em qualquer tabela.
- Logs só com contagens e IDs — nunca nome/telefone/e-mail/valor de cliente.

## 4. Execução local (resultado real)

Rodado contra `barbershop_staging` com `--slug=zeloo --name="Zeloo"`:

| Tabela | Total | Atualizados |
|---|---:|---:|
| user_roles | 11 | 11 |
| clients | 16 | 16 |
| professionals | 5 | 5 |
| services | 9 | 9 |
| appointments | 98 | 98 |
| payments | 73 | 73 |
| pix_charges | 0 | 0 |
| cashbook_entries | 77 | 77 |
| cash_registers | 1 | 1 |
| cash_register_closings | 0 | 0 |
| recurring_account_entries | 0 | 0 |
| account_entries | 35 | 35 |
| commission_closings | 0 | 0 |
| message_templates | 1 | 1 |
| message_logs | 3 | 3 |
| media | 15 | 15 |
| settings | 16 | 16 |
| audit_logs | 57 | 57 |

Zero registros órfãos (`sem_tenant_depois = 0` em todas as tabelas). Tenant criado: `slug=zeloo`, `status=ACTIVE`. 10 usuários associados via `TenantUser` (`status=ACTIVE`).

**Idempotência confirmada**: rodar `--apply` de novo reconheceu o tenant e as memberships existentes, `atualizados=0` em todas as tabelas (nada sobrou pra migrar), sem erro nem duplicação.

**Guardas testadas**: slug reservado (`--slug=admin`) rejeitado; `--slug` ausente rejeitado; `--dry-run` e `--apply` juntos rejeitados.

## 5. Regressão

Login (`admin@barbershop.local`) + Dashboard + Clientes + Agenda testados via Playwright depois do backfill — tudo funcionando normalmente. Esperado: nenhum código da aplicação lê `tenant_id` ainda (isso é Fase 4), então a coluna nova sendo preenchida é completamente transparente pro app hoje.

## 6. O que NÃO foi feito nesta fase (de propósito)

- **Etapa C (Restringir) não foi feita**: `tenant_id` continua nullable em todas as tabelas, sem foreign key obrigatória, sem `@@unique([tenantId, ...])` substituindo as constraints globais atuais. Isso só deve acontecer depois que a Fase 4 (isolamento de queries) garantir que todo código novo sempre grava `tenant_id`, senão qualquer escrita feita por código ainda não adaptado voltaria a criar registros órfãos.
- **Produção não recebeu a migration nem o backfill.** Isso exige janela de manutenção combinada (decisão de negócio #4 da Fase 0) — o backup completo já foi feito antes desta fase (dump de `barbearia_saas`, guardado fora da VPS, + tag git `pre-multi-tenant-2026-07-16`), então a infraestrutura de segurança pra isso já está pronta quando for autorizado.
- Nenhum repository/service foi alterado pra usar `tenant_id` nas queries — as tabelas só têm a coluna, ainda não são lidas/filtradas por ela em nenhum lugar do app.

## 7. Critério de conclusão

Etapas A e B completas e validadas localmente (schema, migration, backfill idempotente, zero órfãos, zero regressão). Etapa C fica pra depois da Fase 4, conforme a ordem de prioridade do spec (§72): "Não antecipe a migration de restrição antes de validar o backfill e os testes."
