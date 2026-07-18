# Checklist — criar um tenant (negócio) novo

> Roteiro de toda vez que um negócio novo entrar na plataforma. **Atualizado em 2026-07-18**: agora existe uma tela de admin de verdade — `/plataforma/tenants`, só acessível pelo login administrador do tenant raiz (zeloo). A rota de diagnóstico `app/api/tenant-debug` continua existindo só pra dev local e agora é bloqueada automaticamente em produção (`NODE_ENV=production` → 404).

## 0. Como isso é feito hoje

Logado como administrador do tenant raiz (zeloo), acessar `/plataforma/tenants` (aparece no menu lateral só nesse tenant). De lá dá pra:

- **Criar um tenant novo** — formulário com checagem de slug em tempo real (mostra na hora se já está em uso ou se é uma palavra reservada, antes de tentar salvar).
- **Ver todos os tenants cadastrados** — nome, subdomínio, dono, status, data de criação.
- **Suspender/reativar** um tenant existente — suspender bloqueia o acesso ao painel daquele negócio imediatamente (`/tenant-indisponivel`, com link de WhatsApp pro suporte já identificando qual negócio está suspenso); reativar restaura o status de antes da suspensão (não promove automaticamente pra `ACTIVE` se o tenant estava em `TRIAL`).

**Gap que continua real** (ver `13-acceptance-criteria.md`): a barreira de acesso é "ser o tenant raiz", não um papel de plataforma de verdade — não existe ainda uma conta "só platform admin, sem ser dona de nenhum negócio". Suficiente pro volume de hoje (operação única), mas vale revisar antes de qualquer expansão com mais de um administrador de plataforma.

## 1. Decisões antes de provisionar

- [ ] **Nome do negócio** (`tenantName`) — nome de exibição, pode ter espaço/acentos.
- [ ] **Slug** — vira o subdomínio (`<slug>.zeloo.net`). Regras (`tenant.schema.ts`): 3-63 caracteres, só minúsculas/números/hífen, começa e termina com letra ou número. **Nunca** um destes (reservados pela plataforma): `www`, `app`, `api`, `admin`, `auth`, `login`, `logout`, `signup`, `register`, `status`, `support`, `suporte`, `mail`, `email`, `financeiro`, `billing`, `static`, `assets`, `cdn`, `files`, `storage`, `health`, `metrics`.
- [ ] **Nome, e-mail e senha do proprietário** — se o e-mail já existir como `User`, reaproveita a conta (permite a mesma pessoa dona de mais de um negócio, ver Fase 14); senão cria uma nova.
- [ ] **Fuso horário e locale** (opcional — default `America/Sao_Paulo` / `pt-BR`).
- [ ] Confirmar que o subdomínio de fato vai resolver: **em produção, isso só funciona depois do Release B** (DNS/SSL wildcard ativos, `MULTITENANCY_ENABLED="true"`). Antes disso, um tenant provisionado existe no banco mas **fica inacessível** — não faz sentido provisionar tenants reais em produção antes do Release B estar no ar.

## 2. Provisionar

`provisionTenant()` é transacional e idempotente (chave natural = slug — rodar de novo com o mesmo slug não recria nada, só retorna o existente). O que ele faz sozinho, numa única transação:

- [ ] Cria o `Tenant` (status `TRIAL`, 30 dias)
- [ ] Cria (ou reaproveita) o `User` do proprietário
- [ ] Cria o vínculo `TenantUser` (membership) e o papel `ADMIN` (`UserRole`) desse usuário nesse tenant
- [ ] Cria a `Subscription` no plano trial (cria o próprio plano trial também, se ainda não existir — compartilhado entre todos os tenants, nunca duplicado)
- [ ] Grava `AuditLog` da ação `tenant_created`

Nada disso precisa ser feito manualmente — é uma chamada só. O que falta (abaixo) é tudo que fica de fora de propósito.

## 3. O que NÃO é feito automaticamente (fazer depois, ou orientar o dono a fazer)

- [ ] **Configurações gerais** (nome de exibição, logo, favicon, telefone, redes sociais) — ficam em branco até o próprio dono preencher em Configurações. `Setting.key` é isolado por tenant (`@@unique([tenantId, key])`, corrigido hoje), então isso já funciona sem colidir com outros tenants — só não vem pré-preenchido.
- [ ] **Serviços e profissionais** — o tenant começa zerado, o dono cadastra pela própria interface.
- [ ] **RBAC além do proprietário** — outros papéis (atendente, caixa, profissional) são criados manualmente pelo dono em Usuários, com as permissões padrão de cada papel (já cadastradas globalmente, não por tenant).
- [ ] **Credenciais do Mercado Pago (Pix)** — o dono precisa configurar as próprias credenciais em Configurações; nada é herdado do tenant `zeloo`.
- [ ] **WhatsApp Business API** — mesma coisa, token/phone number ID são globais no `.env` hoje (não por tenant ainda — se isso precisar ser por tenant no futuro, é uma mudança de arquitetura à parte, não coberta por esta migração).

## 4. Verificação pós-provisionamento

- [ ] Login do proprietário funciona no subdomínio certo (`<slug>.zeloo.net/login`)
- [ ] Branding do `/login` mostra o placeholder genérico (nunca a marca do `zeloo` ou de outro tenant) até o dono configurar a própria
- [ ] Isolamento: nenhum dado de outro tenant aparece (dashboard vazio, sem clientes/agendamentos de ninguém mais)
- [ ] `alreadyProvisioned: false` no retorno (confirma que foi criado agora, não que já existia)

## 5. Caso de teste local (dev)

Pros tenants fictícios usados em teste (`flora`, `diagro`, etc.), o mesmo `provisionTenant()` funciona local sem nenhuma das restrições de produção (subdomínio já resolve via hosts file / `--host-resolver-rules`, ver `03-auth-sessions.md`). Não precisa de DNS/SSL nenhum pra testar localmente.
