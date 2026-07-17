# Fase 11 — Testes automatizados

> Depende de todas as fases anteriores (0-10). Testado só localmente — **produção não foi tocada**. Antes desta fase o projeto não tinha nenhum test runner configurado; toda a verificação das Fases 2-10 foi manual (curl, Playwright ad-hoc, inspeção direta do banco).

## 1. Duas camadas, por quê

A extensão de isolamento (`tenantExtension`, Fase 4) resolve o tenant via `headers()` dentro do ciclo de vida de uma requisição Next.js real — não dá pra simular isso em teste unitário puro sem mockar boa parte do runtime do Next. Por isso a Fase 11 ficou em duas camadas:

- **Vitest** (`npm run test`) — lógica pura, sem servidor: resolução de hostname (`src/lib/tenancy/hostname.ts`), que é Edge-safe e não depende de nada além de string parsing.
- **Playwright Test** (`npm run test:e2e`) — isolamento de dados/auth/branding de verdade, contra um dev server real (`localhost:3000`), usando os hosts de tenant já configurados pelo usuário em `C:\Windows\System32\drivers\etc\hosts` (`127.0.0.1 zeloo.net / flora.zeloo.net / diagro.zeloo.net`, ver `docs/tenancy/03-auth-sessions.md`). O `playwright.config.ts` reforça isso com `--host-resolver-rules` no Chromium, então funciona mesmo sem o hosts file (mas o `request` fixture, que usa o resolver do Node, ainda depende dele).

## 2. Vitest — `src/lib/tenancy/hostname.test.ts` (spec §53)

18 testes cobrindo `resolveTenantHostname`, `resolveRequestHost` e `normalizeHost`: domínio raiz, `www`, domínio central (`app.`), extração de slug, normalização de maiúsculas/porta, slug inexistente (resolve igual — checagem de existência é Node-side), **ataques de sufixo** (`zeloo.net.evil.example`, `flora.zeloo.net.evil.example`, `evilzeloo.net` sem fronteira de ponto), hostname vazio/inválido, subdomínio multi-label, e o comportamento de `trustProxy` do `X-Forwarded-Host`.

```
npm run test
 Test Files  1 passed (1)
      Tests  18 passed (18)
```

## 3. Playwright — `e2e/tenant-isolation.spec.ts` (spec §51)

Usa a rota de diagnóstico `app/api/tenant-debug/route.ts` (Fase 2/4, sem autenticação, só local) pra verificar isolamento de dados/IDOR de forma direta, e a UI real (`/login`, dashboard, logout) pra verificar auth e branding. Tenants fixos do banco local (não existem em produção):

| Tenant | Status | Credencial | Observação |
|---|---|---|---|
| `zeloo` | ACTIVE | `admin@barbershop.local` / `Admin@123` | root domain, dados reais migrados, `barbershop.name = "Zeloo.net"` configurado |
| `flora` | ACTIVE | `dona.flora@teste.local` / `FloraTeste@123` | cliente fixo "Cliente Secreto da Flora" (`test-flora-client-001`), sem settings próprias |
| `diagro` | TRIAL | `dona.diagro@teste.local` / `DiagroTeste@123` | criado via `provisionTenant()` (Fase 9), sem clientes, sem settings |

### 3.1 Resolução de hostname via servidor real (3 testes)
Confirma que `getCurrentTenantContext()`/`getCurrentTenant()` (Node-side, não testável no Vitest) resolvem `root`/`tenant` e o tenant certo pra cada host — integração fim-a-fim com o que a Fase 2/8 documentaram separadamente.

### 3.2 Isolamento de dados entre tenants (4 testes, spec §51)
- Lista de clientes da `flora` só contém o próprio cliente, nunca os de `zeloo`/`diagro`.
- Lista de clientes da `diagro` não contém o cliente da `flora`.
- **IDOR**: do host `diagro`, tentar ler/atualizar o cliente da `flora` pelo ID direto (`probeClientId=test-flora-client-001`) — `foundViaFindUnique: false`, `updateAffected: 0`. Confirma que o deny-by-default da Fase 4 bloqueia acesso direto por ID, não só listagens.
- Controle: do host `flora`, o mesmo ID funciona normalmente.

### 3.3 Isolamento de branding no `/login` (3 testes)
Este é o teste de regressão do **bug reportado pelo usuário em 2026-07-17** (`diagro.zeloo.net:3000/login` supostamente mostrando a logomarca/nome real do tenant `zeloo`) — nunca reproduzido via automação nas investigações da Fase 10/11 (ver nota na memória do projeto), mas agora existe como teste permanente: se a extensão de settings algum dia vazar branding entre tenants, este teste quebra.
- `zeloo` (root) mostra `<h1>Zeloo.net</h1>` (nome configurado de verdade).
- `flora` e `diagro` mostram `<h1>Zeloo</h1>` (placeholder genérico do fallback) e **nenhum** `<img alt="Logomarca da barbearia">` — nunca o branding de `zeloo`.

### 3.4 Isolamento de autenticação (3 testes, spec §29)
- Dona da `flora` tentando logar no host `diagro` (mesma senha, sem membership no tenant `diagro`) → erro "E-mail ou senha inválidos.", continua em `/login`.
- Dona da `flora` logando no próprio host → sucesso, permanece em `flora.zeloo.net`.
- Logout mantém o mesmo subdomínio (`flora.zeloo.net`) — regressão do bug de redirect corrigido no callback `redirect` de `auth.config.ts` (Fase 5/documentado em `03-auth-sessions.md` §7).

```
npm run test:e2e
Running 13 tests using 1 worker
  13 passed (17.6s)
```

## 4. Efeito colateral conhecido (não é bug)

O probe de IDOR (`probeClientId`) faz um `updateMany` real, então cada execução da suíte sobrescreve `notes` do cliente fixo `test-flora-client-001` ("Cliente Secreto da Flora") para `"probe-isolation-test"`. É dado de teste descartável, criado especificamente pra esse fim — não afeta nenhum dado de produção ou de `zeloo`.

## 5. O que NÃO foi coberto nesta fase (de propósito)

- **Testes de carga/concorrência entre tenants** (spec menciona isolamento, não performance sob carga) — fora de escopo, projeto não tem infraestrutura de load testing.
- **Cache/filas/scheduler** — Fase 6 já documentou que o projeto não tem essa infraestrutura, não há o que testar.
- **Nginx/DNS/SSL wildcard** (Fase 12) — ainda não implementado, será testado na própria fase.
- **Produção não foi tocada.**

## 6. Critério de conclusão

Duas suítes automatizadas, 31 testes no total (18 unitários + 13 e2e), cobrindo os cenários centrais do spec §51 (isolamento de dados, IDOR) e §53 (resolução de hostname), mais dois regressões de bugs reais encontrados nesta migração (branding leak não-reproduzido e redirect de logout). Ambas passam de forma consistente (`npm run test` && `npm run test:e2e`).
