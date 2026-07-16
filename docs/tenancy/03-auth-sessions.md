# Fase 5 — Autenticação e sessões

> Depende de `docs/tenancy/00-audit.md`, `01-architecture.md`, `01b-tenant-resolver.md`, `02-data-migration.md`, `02b-query-isolation.md`. Testado só localmente — **produção não foi tocada**.

## 1. Login por tenant (spec §29)

`src/lib/auth/auth.ts` (`authorize()`) agora, na ordem exata do spec:

1. **Tenant obtido pelo hostname** — `getCurrentTenant()` (Fase 2), nunca de um campo do formulário de login.
2. Sem tenant resolvido → nega (retorna `null`, mesmo caminho de "credenciais inválidas").
3. **Tenant ativo ou em trial** — `status !== "ACTIVE" && status !== "TRIAL"` nega antes de checar senha.
4. **Usuário existente** + **credenciais** — `AuthService.validateCredentials()` (já existia, sem mudança de comportamento).
5. **Associação ativa do usuário com o tenant** — `TenancyRepository.findActiveMembership(tenantId, userId)` (`TenantUser` com `status: "ACTIVE"`); sem isso, nega mesmo com senha certa.
6. **Permissões dentro daquele tenant** — automático, sem código novo: `UserRole` já é um `HARD_TENANT_MODEL` desde a Fase 4, então `getSessionPermissions()` (`src/lib/auth/rbac.ts`, inalterado) já vem filtrado pelo tenant da sessão através da extensão do Prisma.

Todas as falhas (tenant inexistente, suspenso, senha errada, sem membership) retornam o mesmo `null` genérico — não dá pra descobrir de fora qual dos casos aconteceu.

## 2. Sessão com tenant explícito (spec §29, §32)

JWT/sessão ganharam `tenantId`/`tenantSlug` (`src/types/next-auth.d.ts` — augmentation dos tipos do NextAuth; `src/lib/auth/auth.config.ts` — callbacks `jwt`/`session` carregam os campos novos). Setados **uma vez, no momento do login** (dentro de `authorize()`) — trocar de tenant exige logar de novo no subdomínio certo, não existe "troca de tenant" dentro da mesma sessão (login central com seleção de tenant é o §30 do spec, opcional, não implementado nesta fase).

**Cross-check a cada requisição** (`app/(app)/layout.tsx`): compara `session.user.tenantId` (do token) contra o tenant resolvido pelo hostname da requisição atual — divergência desloga (`redirect("/login")`). Defesa em profundidade: o escopo padrão de cookie por host (§3 abaixo) já torna esse cenário praticamente inalcançável num navegador real, mas protege contra bug de resolução de hostname ou reuso deliberado de cookie fora do navegador.

## 3. Cookies (spec §31)

Nenhuma configuração de cookie customizada existe no projeto (`grep cookies` em `src/lib/auth/` não encontra nada) — o NextAuth usa o padrão: sem atributo `Domain` explícito, então o cookie fica restrito ao hostname exato que fez login (`flora.zeloo.net` não recebe o cookie de `zeloo.net` nem vice-versa, aplicado pelo próprio navegador). **`Domain=.zeloo.net` nunca foi adicionado** — nada a corrigir aqui, só confirmado e documentado.

`HttpOnly`/`SameSite` seguem os padrões do NextAuth v5 (já adequados); `Secure` é automático em produção (`AUTH_URL` com `https://`, já configurado assim na VPS — ver `project-vps-zeloo` na memória do projeto).

## 4. Testes realizados

Criado um usuário de teste (`dona.flora@teste.local`) com membership ativa só no tenant `flora` (o mesmo tenant fictício da Fase 4). Testado via Playwright com Chromium `--host-resolver-rules` (mapeando `zeloo.net`/`flora.zeloo.net` pra `127.0.0.1`, mesma técnica já documentada no projeto pra testar hostname antes de DNS real):

| Cenário | Resultado |
|---|---|
| `dona.flora@teste.local` loga em `flora.zeloo.net` (membership ativa) | ✅ Sucesso, sessão criada |
| Cookie de sessão da `flora` reenviado manualmente (via `curl -H "Host: zeloo.net"`) pro host `zeloo.net` | ✅ Bloqueado — redirect 307 pra `/login` (cross-check server-side) |
| `admin@barbershop.local` (só é membro de `zeloo`) tenta logar em `flora.zeloo.net` | ✅ Negado — permanece em `/login` |
| `admin@barbershop.local` loga em `zeloo.net` (seu tenant de verdade) | ✅ Sucesso, sessão criada (baseline) |
| Tenant `flora` suspenso (`status: SUSPENDED`) + tentativa de login de um membro ativo | ✅ Negado — permanece em `/login` |

Regressão: login via `localhost` (bypass de dev) + navegação por clientes/agenda/configurações/contas a pagar — sem erro, `getSessionPermissions()` continua funcionando normalmente (prova que o isolamento automático de `UserRole` da Fase 4 não quebrou RBAC).

## 5. O que NÃO foi feito nesta fase (de propósito)

- **Login central (`app.zeloo.net`, spec §30)** — opcional no spec, não implementado. Hoje cada tenant loga no seu próprio host (`zeloo.net` pro tenant raiz, `<slug>.zeloo.net` pros demais). Se o usuário quiser um fluxo de seleção de tenant (útil pra quem tem membership em mais de um), fica pra depois.
- **Rotação de sessão explícita ao mudar de tenant** — não se aplica ainda (não existe troca de tenant dentro da mesma sessão, cada login já gera uma sessão nova por padrão do NextAuth).
- **CSRF** — o NextAuth já cuida disso nativamente pro fluxo de credentials (token CSRF próprio, verificado nos testes acima — login funcionou normalmente).
- **Produção não foi tocada.** `AUTH_TRUST_HOST=true` foi adicionado só ao `.env` local (necessário pra testar hostnames diferentes de `localhost`) — produção já tem essa variável configurada há mais tempo (ver `project-vps-zeloo` na memória).

## 6. Critério de conclusão

Login valida tenant, membership e status antes de autenticar; sessão carrega e valida tenant a cada requisição; cookies já seguem o padrão seguro do spec sem mudança necessária. Todos os cenários de negação testados de verdade (não só o caminho feliz).
