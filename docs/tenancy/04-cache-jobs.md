# Fase 6 — Cache, Redis, filas, scheduler e WebSockets

> Depende de `docs/tenancy/00-audit.md`. Conclusão: **majoritariamente N/A pra este projeto hoje** — registrado como decisão explícita, não como item pulado sem verificação.

## 1. Verificação (re-confirmada nesta fase)

```
grep -rlE "redis|ioredis|bullmq|bull\(|node-cron|cron\.schedule|unstable_cache|new WebSocket|socket\.io" src/ app/ package.json
```
Zero resultados — mesmo achado da auditoria da Fase 0 (`00-audit.md` §8), reconfirmado antes de fechar esta fase.

## 2. Por item do spec

| Item do spec | Situação |
|---|---|
| §33 Cache tenant-aware | **N/A** — não existe cache compartilhado entre requisições (Redis, memória, `unstable_cache`). O único "cache" do projeto é `React.cache()`, que é *por requisição* — nunca sobrevive entre usuários/tenants diferentes, não há risco de vazamento aí. |
| §34 Sessões | **Já resolvido na Fase 5** — sessão é JWT (não Redis/banco), carrega `tenantId` e é validada a cada requisição contra o hostname atual (`app/(app)/layout.tsx`). |
| §35 Jobs e filas | **N/A** — não existe fila (Bull/BullMQ) nem worker separado. PM2 roda um único processo (o app Next). |
| §36 Scheduler e cron | **N/A** — não existe `node-cron` nem cron do SO chamando a aplicação. A única rotina "recorrente" (`RecurringAccountEntry` → gera `AccountEntry` do mês) roda *lazy*, sob demanda, dentro de `AccountService.ensureRecurringGenerated()` — chamada síncrona dentro de uma requisição normal, já protegida pelo isolamento de tenant da Fase 4 (o `AccountEntry` criado ali passa pela extensão do Prisma como qualquer outra escrita). |
| §37 WebSockets | **N/A** — não existe nenhum canal de tempo real na aplicação. |

## 3. Quando isso deixar de ser N/A

Se no futuro o projeto adicionar Redis (cache ou fila) ou WebSockets, os princípios do spec continuam válidos e devem ser aplicados no momento da introdução, não retroativamente aqui:
- Toda chave de cache deve incluir `tenantId` (`tenant:{tenantId}:...`).
- Todo job de fila deve carregar `tenantId` no payload e reestabelecer o contexto de tenant antes de executar (mesmo padrão de `getCurrentTenant()`, mas via payload do job em vez de `headers()`, já que jobs não têm requisição HTTP).
- Todo canal WebSocket deve ter namespace de tenant.

## 4. Critério de conclusão

Nenhuma implementação necessária nesta fase — infraestrutura correspondente não existe no projeto. Documentado para não ser reavaliado do zero numa fase futura.
