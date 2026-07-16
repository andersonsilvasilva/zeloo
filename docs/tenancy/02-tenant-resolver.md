# Fase 2 — Contexto do tenant por subdomínio

> Depende de `docs/tenancy/00-audit.md` e `01-architecture.md`. Testado só localmente — **middleware não foi ativado em produção nesta fase**.

## 1. O que foi implementado

- `src/lib/tenancy/hostname.ts` — lógica pura (sem I/O) de resolução de hostname → `{ kind: "invalid" | "root" | "central" | "tenant", ... }`. Roda tanto no Edge (middleware) quanto Node-side.
- `src/lib/tenancy/headers.ts` — nomes dos headers usados pra passar o resultado do middleware (Edge) pro código Node-side, isolado num arquivo sem dependências (ver §3).
- `middleware.ts` — **reativado** (estava `matcher: []` desde 2026-07-10, ver `00-audit.md` §3). Resolve o hostname, injeta `x-tenant-slug`/`x-tenant-context` como headers da requisição. Nunca chama `NextResponse.redirect()` (só `NextResponse.next()` ou uma `Response` direta pra host inválido) — mitigação deliberada contra o mesmo padrão de falha do incidente de 2026-07-10, independente de esse bug específico ainda valer na VPS+Nginx atual (não testado em produção).
- `src/lib/tenancy/current-tenant.ts` — Node-side: `getCurrentTenant()`/`getCurrentTenantSlug()` (cache por request, mesmo padrão de `getSessionPermissions()`), e `requireCurrentTenant()` (404 se não existe, redireciona pra `/tenant-indisponivel` se suspenso/cancelado — spec §18). **Nenhuma rota real chama isso ainda** — é Fase 4/5.
- `app/api/tenant-debug/route.ts` — rota de diagnóstico só pra esta fase, mostra o que foi resolvido pro hostname da requisição. **Sem autenticação — precisa de gate antes de qualquer deploy** (hoje não é alcançável de fora do ambiente local, já que não tem link nenhum pra ela).
- `.env.example` e `.env` local: `APP_BASE_DOMAIN`, `TENANCY_MODE`, `ROOT_TENANT_SLUG` (nova, não prevista no spec original — necessária pela decisão de domínio raiz da Fase 0), `DEFAULT_TENANT_SLUG`, `CENTRAL_DOMAINS`, `TRUST_PROXY`, `TENANT_CACHE_PREFIX`, `TENANT_STORAGE_PREFIX`.

## 2. Por que a lógica pura não faz lookup no banco

Middleware roda no **Edge Runtime** por padrão no Next.js. O Prisma deste projeto usa `engineType = "binary"` (spawna processo separado — ver comentário em `prisma/schema.prisma`), que **não é compatível com Edge Runtime**. Por isso:
- `hostname.ts` só extrai o slug do hostname — nunca confirma se o tenant existe de verdade.
- A confirmação (existe? status?) é sempre Node-side, em `current-tenant.ts`, chamada a partir de layouts/páginas/actions normais (fora do middleware).

## 3. Por que `headers.ts` é um arquivo separado

Uma primeira versão importava as constantes de header direto de `current-tenant.ts` dentro do `middleware.ts`. Isso quase quebrou o build: `current-tenant.ts` importa `next/headers`, `next/navigation` e o `TenancyRepository` (que arrasta `@/lib/prisma` → extensão de auditoria → `auth.ts` → bcrypt), tudo isso acabaria no bundle do Edge Runtime do middleware — que não suporta esses módulos Node. Extrair as duas constantes pra um arquivo sem nenhuma dependência resolveu.

## 4. Caso especial: domínio raiz = tenant inicial

Conforme decisão da Fase 0 (`00-audit.md` §12, item 2): `zeloo.net`/`www.zeloo.net` resolvem pro tenant fixo de `ROOT_TENANT_SLUG` (`"zeloo"`), não pra um fluxo institucional. `app.zeloo.net`/`admin.zeloo.net`/`api.zeloo.net` continuam como domínios centrais (`kind: "central"`, sem tenant).

## 5. Bypass de desenvolvimento local

**Achado durante o teste desta fase, não previsto originalmente**: com o middleware validando hostname contra `APP_BASE_DOMAIN=zeloo.net`, o acesso local normal (`http://localhost:3000`, sem spoofar o header `Host`) passou a devolver 400 em toda rota — porque `localhost` não bate com `zeloo.net`, nenhum domínio central, nem é subdomínio válido. Isso quebraria completamente o fluxo de desenvolvimento (inclusive testes já usados nesta sessão, como login via `admin@barbershop.local`).

**Correção**: quando `NODE_ENV !== "production"` e o host é `localhost`/`127.0.0.1` (qualquer porta), o middleware trata como domínio raiz direto, sem rodar a validação normal. Nunca ativo em produção.

## 6. Testes realizados (locais, via `curl -H "Host: ..."` e Playwright)

Cobertura dos casos do spec §53:

| Host testado | Resultado | Esperado |
|---|---|---|
| `zeloo.net` | `root` / slug `zeloo` | ✅ |
| `www.zeloo.net` | `root` / slug `zeloo` | ✅ |
| `app.zeloo.net` | `central`, sem slug | ✅ |
| `admin.zeloo.net` | `central`, sem slug | ✅ |
| `flora.zeloo.net` | `tenant` / slug `flora` (tenant não existe no banco → `tenant: null`) | ✅ |
| `FLORA.ZELOO.NET` (maiúsculo) | igual ao anterior, normalizado | ✅ |
| `flora.zeloo.net:443` (porta) | igual, porta ignorada | ✅ |
| `zeloo.net.evil.example` | `invalid`, HTTP 400 | ✅ (ataque de sufixo bloqueado) |
| `flora.zeloo.net.evil.example` | `invalid`, HTTP 400 | ✅ |
| `evilzeloo.net` (sem `.` de fronteira) | `invalid`, HTTP 400 | ✅ (suffix match sem boundary seria vulnerável aqui) |
| host vazio | `invalid`, HTTP 400 | ✅ |
| `flora!.zeloo.net` (caractere inválido) | `invalid`, HTTP 400 | ✅ |
| `login.zeloo.net` (slug reservado, não-central) | `tenant` / slug `login`, `tenant: null` (nunca poderá existir — Fase 1 bloqueia criação) | ✅ |
| `X-Forwarded-Host: flora.zeloo.net` com `Host: zeloo.net`, `TRUST_PROXY=false` | ignora o forwarded, usa `Host` real → `root` | ✅ (spoof bloqueado) |
| `localhost`/`127.0.0.1` (dev) | `root` / slug `zeloo` (bypass) | ✅ |

Regressão: login (`admin@barbershop.local`) + dashboard + Configurações testados via Playwright com o middleware ativo — sem erros novos no console (só o warning pré-existente do Recharts `defaultProps`, não relacionado).

## 7. O que NÃO foi feito nesta fase (de propósito)

- **Middleware não foi ativado em produção.** A ressalva do `00-audit.md` §3 (validar se o bug do Passenger ainda se aplica atrás do Nginx da VPS) continua de pé — isso precisa de um smoke test dedicado em produção antes de qualquer deploy real desta mudança, fora do escopo desta fase (só local).
- Nenhuma rota real (login, dashboard, páginas de negócio) usa `getCurrentTenant()`/`requireCurrentTenant()` ainda — isso é Fase 4 (isolamento de consultas) e Fase 5 (autenticação por tenant).
- `/tenant-indisponivel` (página de tenant suspenso/cancelado, referenciada por `requireCurrentTenant()`) ainda não existe — precisa ser criada antes da Fase 4 usar essa função de verdade.
- `app/api/tenant-debug` não tem autenticação — não deployar sem gate.

## 8. Critério de conclusão

Resolver funcional e testado localmente contra todos os casos de hostname do spec §53, sem regressão no fluxo de auth existente. Ativação em produção fica pra quando a Fase 4/5 tiverem algo real usando o contexto de tenant — ativar middleware sozinho, sem nada consumindo, não traz valor e só adiciona risco antes da hora.
