# Checklist — criar um tenant (negócio) novo

> Roteiro de toda vez que um negócio novo entrar na plataforma. **Hoje não existe uma tela de admin pra fazer isso com segurança** — só um script direto no banco (via `provisionTenant()`) ou a rota de diagnóstico `app/api/tenant-debug` (sem autenticação, nunca deve existir em produção). Isso é uma lacuna real, sinalizada no item 0 abaixo, não um passo a passo de uma feature pronta.

## 0. Antes de tudo: como isso é feito hoje (gap conhecido)

Não existe UI de "criar novo negócio" nem rota autenticada pra isso — só `provisionTenant()` (`src/modules/tenancy/services/tenant-onboarding.service.ts`), chamada hoje só pela rota de diagnóstico `POST /api/tenant-debug`, que é **sem autenticação** e não pode existir em produção. Até esse gap ser resolvido (uma tela de admin de verdade, ou pelo menos uma rota autenticada só pra platform admin — que também não existe, ver `13-acceptance-criteria.md`), criar um tenant novo em produção significa rodar um script one-off no servidor chamando `provisionTenant()` diretamente, por alguém com acesso à VPS. Isso é aceitável pro volume de hoje (poucos tenants, criados manualmente), mas não escala — vale priorizar essa tela antes de qualquer expansão comercial real.

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
