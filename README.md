<div align="center">

# 💈 Zeloo

### Plataforma multi-tenant de gestão para pequenos negócios — agendamento, financeiro, clientes e muito mais

Aplicação web full-stack SaaS para gestão operacional, financeira e comercial de pequenos negócios baseados em atendimento com hora marcada (barbearias, salões, clínicas, estúdios, personal trainers...), com um fluxo público de **auto-agendamento** para os clientes finais. Cada negócio opera isolado dos demais no mesmo sistema — dados, configurações e marca próprios, sem enxergar nem ser enxergado pelos outros.

[![Next.js](https://img.shields.io/badge/Next.js_14-black?style=flat-square&logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-black?style=flat-square&logo=react&logoColor=61DAFB)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Prisma](https://img.shields.io/badge/Prisma-2D3748?style=flat-square&logo=prisma&logoColor=white)](https://www.prisma.io/)
[![MySQL](https://img.shields.io/badge/MySQL_8-4479A1?style=flat-square&logo=mysql&logoColor=white)](https://www.mysql.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Auth.js](https://img.shields.io/badge/Auth.js_v5-000000?style=flat-square&logo=auth0&logoColor=white)](https://authjs.dev/)
[![Zod](https://img.shields.io/badge/Zod-3E67B1?style=flat-square&logo=zod&logoColor=white)](https://zod.dev/)
[![WhatsApp Cloud API](https://img.shields.io/badge/WhatsApp_Cloud_API-25D366?style=flat-square&logo=whatsapp&logoColor=white)](https://developers.facebook.com/docs/whatsapp)

[![Playwright](https://img.shields.io/badge/Playwright-2EAD33?style=flat-square&logo=playwright&logoColor=white)](https://playwright.dev/)
[![Vitest](https://img.shields.io/badge/Vitest-6E9F18?style=flat-square&logo=vitest&logoColor=white)](https://vitest.dev/)
[![Node.js](https://img.shields.io/badge/node-%3E%3D20-339933?style=flat-square&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![Deploy](https://img.shields.io/badge/deploy-VPS_(PM2_%2B_Nginx)-673DE6?style=flat-square&logo=linux&logoColor=white)](#-deploy-em-produção)
[![Status](https://img.shields.io/badge/status-em_produção-success?style=flat-square)](https://zeloo.net)
[![Versão](https://img.shields.io/badge/versão-2.0_multi--tenant-blueviolet?style=flat-square)](#-multi-tenant-como-funciona)
[![License](https://img.shields.io/badge/license-privado-red?style=flat-square)](#-licença)

</div>

---

## 📖 Índice

- [Visão geral](#-visão-geral)
- [Multi-tenant: como funciona](#-multi-tenant-como-funciona)
- [Funcionalidades](#-funcionalidades)
- [Stack técnica](#-stack-técnica)
- [Arquitetura](#-arquitetura)
- [Controle de acesso (RBAC)](#-controle-de-acesso-rbac)
- [Como rodar localmente](#-como-rodar-localmente)
- [Variáveis de ambiente](#-variáveis-de-ambiente)
- [Banco de dados](#-banco-de-dados)
- [Dados fictícios (seed de demonstração)](#-dados-fictícios-seed-de-demonstração)
- [Integração com WhatsApp](#-integração-com-whatsapp)
- [Testes](#-testes)
- [Deploy em produção](#-deploy-em-produção)
- [Estrutura de pastas](#-estrutura-de-pastas)
- [Roadmap](#-roadmap)
- [Desenvolvedor](#-desenvolvedor)
- [Licença](#-licença)

---

## 🎯 Visão geral

O **Zeloo** cobre o ciclo completo de um negócio baseado em atendimento com hora marcada: da divulgação e captação de clientes (vitrine pública com auto-agendamento) até a gestão interna do dia a dia (agenda, caixa, relatórios, equipe e permissões) — e faz isso pra **múltiplos negócios independentes na mesma instalação**, cada um com seu próprio subdomínio, dados isolados e marca própria.

O projeto tem **duas frentes**, replicadas por tenant:

| | |
|---|---|
| 🌐 **Vitrine pública** (`/agendar`) | Cliente final escolhe profissional e serviço, se identifica (com ou sem conta) e agenda seu próprio horário — sem precisar de login prévio. |
| 🔐 **Painel interno** (`/`) | Equipe do negócio (admin, atendente, profissional, caixa) gerencia agenda, clientes, financeiro, relatórios, mensagens e usuários, cada um enxergando só o que sua permissão libera. |

---

## 🏢 Multi-tenant: como funciona

Cada negócio cadastrado (**tenant**) é isolado dos demais em todos os níveis — dados, autenticação, arquivos enviados e configurações visuais:

- **Um subdomínio por negócio** (`<slug>.zeloo.net`) resolve automaticamente qual tenant atender, a partir do hostname da própria requisição — nunca de um parâmetro que o cliente possa manipular. O tenant original do sistema fica no domínio raiz (`zeloo.net`).
- **Isolamento de dados obrigatório e por padrão**: toda leitura/escrita em tabelas pertencentes a um tenant passa por uma extensão do Prisma Client que injeta o tenant da requisição atual automaticamente — e **recusa a operação** se nenhum tenant foi resolvido, em vez de arriscar vazar dado entre negócios. `tenant_id` enviado pelo cliente nunca é usado como fonte de verdade.
- **Autenticação por tenant**: login valida credencial + vínculo do usuário com aquele negócio específico (`membership`) + status do negócio (ativo/em teste/suspenso) — uma sessão emitida num subdomínio nunca é aceita em outro, mesmo que o cookie chegasse até lá.
- **Um usuário pode ter acesso a mais de um negócio** (ex.: um consultor que atende várias contas), operando em um por vez conforme o subdomínio acessado.
- **Arquivos enviados** (logo, fotos de profissionais/clientes) ficam segregados por tenant no armazenamento (`tenants/{id}/...`), assim como configurações de marca (nome, logomarca, favicon, cores) — cada negócio vê e edita só a própria identidade visual.
- **Onboarding de negócio novo é transacional e idempotente**: cria o tenant, o usuário proprietário, o vínculo e a assinatura em teste numa única operação.

**Status de implantação (v2.0)**: a arquitetura multi-tenant está implementada, documentada fase a fase (14 documentos técnicos + relatório final em [`docs/tenancy/`](docs/tenancy/)), coberta por 42 testes automatizados e **ativa em produção** — `MULTITENANCY_ENABLED=true`, resolução real por subdomínio ligada. O tenant original segue no domínio raiz (`zeloo.net`) sem qualquer mudança de comportamento; o primeiro subdomínio de negócio novo (`cezarios.zeloo.net`) já foi provisionado como piloto (SSL + Nginx via [`deploy/provisionar-subdominio.sh`](deploy/provisionar-subdominio.sh), rodado manualmente por um humano na VPS — de propósito não exposto pela aplicação web). Como ainda não há DNS/SSL wildcard, novos subdomínios continuam sendo provisionados um a um com esse script até que valha a pena automatizar isso. A tela **Tenants** (`/plataforma/tenants`, restrita ao tenant raiz) permite cadastrar negócios novos e promover/suspender/reativar cada um; um tenant suspenso ou cancelado vê uma página informativa (`/tenant-indisponivel`) em vez do painel. Ver [`docs/tenancy/FINAL-REPORT.md`](docs/tenancy/FINAL-REPORT.md) para o histórico completo e riscos remanescentes.

---

## ✨ Funcionalidades

### Vitrine pública de agendamento (`/agendar`)
- Landing com logomarca, nome do negócio e mensagem de marketing configuráveis por tenant
- Escolha do profissional, seguida de uma página de perfil dele (foto, bio e só os serviços que ele especificamente oferece, com preço e duração)
- Identificação rápida por nome + telefone (sem senha) — com busca automática de cadastro existente pelo telefone (mostra o nome encontrado para o visitante confirmar) — ou criação de conta opcional (e-mail + senha) para acompanhar o histórico depois
- Calendário com disponibilidade em tempo real (reaproveita a mesma lógica de conflito de horário do painel interno) e seleção de horário
- Confirmação com resumo e valor total, com auto-envio de confirmação por WhatsApp quando aplicável

### Painel interno
- **Dashboard** com indicadores do dia/semana/mês/ano, gráficos de faturamento e distribuição de serviços, relógio digital ao vivo com a agenda do dia e box de aniversariantes (hoje/semana/mês)
- **Agenda**: CRUD completo de agendamentos com checagem automática de conflito de horário, fluxo de status (`Pendente → Confirmado → Em atendimento → Concluído`, com `Cancelado`/`Não compareceu`), reagendamento, atalho para registrar pagamento direto na lista e exclusão definitiva restrita ao Administrador (bloqueada se já houver pagamento registrado)
- **Clientes**, **Profissionais** e **Serviços**: CRUD completo com upload de fotos (thumbnail/média/grande gerados automaticamente)
- **Financeiro**: abertura/fechamento de caixa, livro-caixa (entradas/saídas), registro de pagamentos (dinheiro, cartão ou **Pix via Mercado Pago** — QR code, copia-e-cola, confirmação automática por webhook e recibo imprimível) e **Balancete débito/crédito** por categoria, com impressão/exportação em PDF
- **Relatórios**: indicadores por período customizável (diferente dos buckets fixos do dashboard), com impressão/exportação em PDF — profissionais veem automaticamente só os próprios números
- **Mensagens**: modelos de mensagem com variáveis dinâmicas (`{{clientName}}`, `{{professional_agendado}}`, `{{resumo_agendamento}}`), envio manual ou automático ao criar/concluir agendamento, e **envio real via WhatsApp Cloud API**
- **Usuários e permissões**: gestão de contas da equipe e papéis (RBAC configurável pela própria interface), com exclusão de conta de login que preserva histórico e cadastro vinculado
- **Configurações**: logomarca, favicon, imagem de compartilhamento, nome, bio, redes sociais, fuso horário e dados do negócio, credenciais do Mercado Pago e **log de auditoria** de alterações no sistema — tudo por tenant
- **Modais de confirmação** consistentes (Design System próprio) em toda ação destrutiva ou que exige atenção — excluir, cancelar

---

## 🛠️ Stack técnica

| Camada | Tecnologia |
|---|---|
| Frontend | Next.js 14 (App Router), React, TypeScript, Tailwind CSS |
| Backend | Server Actions do próprio Next.js, em camadas (`Component → Action → Service → Repository`) |
| Banco de dados | MySQL 8+ |
| ORM | Prisma (engine `binary`, `binaryTargets` para Windows + Linux/Debian) |
| Multi-tenant | Resolução por subdomínio (Edge) + extensão do Prisma Client pra isolamento obrigatório (Node) |
| Autenticação | Auth.js v5 (Credentials), sessão JWT por tenant |
| Autorização | RBAC centralizado (roles + permissions no banco, sem hardcode de papéis no código) |
| Validação | Zod (schemas compartilhados frontend/backend) |
| Formulários | React Hook Form + Zod Resolver |
| Gráficos | Recharts |
| Imagens | Sharp (variantes thumb/medium/large) + `StorageProvider` abstrato (local hoje, S3/R2/Supabase plugáveis), segregado por tenant |
| Mensageria | WhatsApp Cloud API (Meta) |
| Ícones | Lucide React |
| Datas | date-fns / date-fns-tz |
| Testes | Vitest (unitário) + Playwright (e2e) — 42 testes automatizados |
| Deploy | Node.js standalone via PM2 + Nginx (VPS) |
| Pagamentos | Mercado Pago (Pix) |

---

## 🏗️ Arquitetura

Todo módulo de domínio segue a mesma regra de camadas — **nenhum componente React importa o Prisma Client diretamente**:

```
Component (UI)
    │
    ▼
Action ("use server" — sessão + permissão + validação Zod)
    │
    ▼
Service (regra de negócio, transações)
    │
    ▼
Repository (Prisma / MySQL)
```

Use o módulo `appointments` como referência completa desse padrão (schema Zod → action → service transacional com checagem de conflito → repository).

O fluxo público (`/agendar`) vive em `src/modules/booking/` e **nunca confia num `clientId` vindo do formulário**: resolve o cliente pela sessão (quando existe conta) ou reconfere o telefone informado contra o cadastro antes de criar o agendamento.

O isolamento entre tenants acontece em duas camadas — `middleware.ts` (Edge Runtime, resolve o hostname sem tocar no banco, já que o engine `binary` do Prisma não roda em Edge) e `src/lib/tenancy/tenant-extension.ts` (Node, aplica o filtro/injeção real de `tenant_id` em toda query). Ver [`CLAUDE.md`](CLAUDE.md) para os detalhes de implementação e [`docs/tenancy/`](docs/tenancy/) para o histórico completo de decisões.

---

## 🔐 Controle de acesso (RBAC)

| Papel | Escopo |
|---|---|
| `ADMIN` | Acesso total (dentro do próprio tenant) |
| `ATTENDANT` | Clientes, agenda, profissionais/serviços (leitura) — sem financeiro |
| `PROFESSIONAL` | Agenda e relatórios **restritos aos próprios atendimentos** — nunca vê financeiro de outros profissionais |
| `CASHIER` | Financeiro + agenda + clientes |
| `CLIENT` | Auto-agendamento (`/agendar`) |

Permissões centralizadas em `src/lib/auth/permissions.ts` (ex.: `clients.view`, `finance.create`, `appointments.cancel`). A checagem **nunca** é feita como `if (role === "ADMIN")` — sempre via `requirePermission()` (`src/lib/auth/rbac.ts`), que consulta a relação `Role → RolePermission → Permission` no banco. Isso permite ao Administrador reconfigurar permissões pela própria tela de **Usuários**, sem alterar código.

> **Regra de negócio importante:** o papel `PROFESSIONAL` nunca recebe permissões `finance.*` — profissionais não devem visualizar informações financeiras globais do negócio. Papéis são sempre escopados ao tenant — um mesmo usuário pode ter papéis diferentes em negócios diferentes.

---

## 🚀 Como rodar localmente

**Pré-requisitos:** Node.js 20+, MySQL 8+, npm.

```bash
git clone https://github.com/andersonsilvasilva/zeloo.git
cd zeloo
npm install
cp .env.example .env
# edite o .env com sua string de conexão MySQL e gere um AUTH_SECRET:
openssl rand -base64 32
```

```bash
npm run prisma:migrate    # cria as tabelas (dev)
npm run prisma:seed       # popula RBAC + usuário admin + configurações padrão
npm run dev
```

Acesse `http://localhost:3000` — isso resolve como o tenant raiz (bypass de desenvolvimento em `middleware.ts`, nunca ativo em produção).

**Login padrão criado pelo seed** (troque a senha imediatamente em produção):

- E-mail: `admin@barbershop.local`
- Senha: `Admin@123`

Para testar múltiplos tenants localmente (subdomínios reais, não só o tenant raiz), veja [`docs/tenancy/03-auth-sessions.md`](docs/tenancy/03-auth-sessions.md) — resumo: mapear `<slug>.zeloo.net` pra `127.0.0.1` no hosts do sistema, ou usar `--host-resolver-rules` do Chromium/Playwright sem precisar mexer no hosts.

---

## 🔧 Variáveis de ambiente

| Variável | Descrição |
|---|---|
| `DATABASE_URL` | String de conexão MySQL |
| `AUTH_SECRET` | Chave do Auth.js (`openssl rand -base64 32`) |
| `AUTH_URL` | URL pública da aplicação |
| `AUTH_TRUST_HOST` | `true` quando atrás de proxy ou com múltiplos hosts (produção/multi-tenant) |
| `STORAGE_PROVIDER` | `local` \| `s3` \| `r2` \| `supabase` |
| `WHATSAPP_BUSINESS_API_TOKEN` | Token da WhatsApp Cloud API (Meta) |
| `WHATSAPP_PHONE_NUMBER_ID` | Phone Number ID cadastrado na Meta |
| `WHATSAPP_TEMPLATE_NAME` / `WHATSAPP_TEMPLATE_LANGUAGE` | Template aprovado na Meta para envio automático |
| `TWILIO_*` / `ZENVIA_API_TOKEN` | Provedores alternativos de SMS (opcional, não integrado ainda) |
| `MULTITENANCY_ENABLED` | `true` ativa a resolução de tenant por subdomínio; `false`/ausente opera em modo single-tenant explícito (todo tráfego atende o tenant raiz) — switch de ativação segura em produção |
| `APP_BASE_DOMAIN` / `ROOT_TENANT_SLUG` / `CENTRAL_DOMAINS` | Domínio base multi-tenant, slug do tenant servido na raiz, domínios reservados (ex.: futuro login central) |
| `TRUST_PROXY` | Só `true` atrás de um proxy confiável que reescreva `X-Forwarded-Host` — nunca em produção sem CDN/proxy adicional na frente do Nginx |

Veja todos os valores de exemplo em [`.env.example`](.env.example).

---

## 🗄️ Banco de dados

Schema completo em [`prisma/schema.prisma`](prisma/schema.prisma) — 31 models cobrindo autenticação/RBAC, tenants/planos/assinaturas, clientes, profissionais, serviços, agendamentos, financeiro, mensageria, mídia e auditoria.

```bash
npm run prisma:migrate     # aplica migrations em dev
npm run prisma:deploy      # aplica migrations em produção
npm run prisma:generate    # gera o Prisma Client
```

> **Nota sobre hospedagem compartilhada:** em ambientes com restrições de sandbox (ex.: CageFS da Hostinger), rodar `prisma migrate deploy` direto pode falhar com múltiplas instruções SQL em lote — nesse caso, aplique a migration instrução por instrução (ver histórico do projeto) ou rode as migrations num ambiente com acesso irrestrito ao banco.

---

## 🎭 Dados fictícios (seed de demonstração)

```bash
npm run prisma:seed:demo               # profissionais, clientes, serviços, equipe de teste
npm run prisma:seed:demo:appointments  # histórico de agendamentos/pagamentos (últimos ~60 dias + próximos dias)
```

Usuários fictícios (profissionais/atendentes/caixa) usam a senha `Teste@123`.

---

## 💬 Integração com WhatsApp

O envio de mensagens (confirmação automática de agendamento, modelos manuais) usa a **WhatsApp Cloud API** da Meta (`src/lib/whatsapp/whatsapp-client.ts`).

Pontos de atenção:
- Fora da janela de 24h de uma conversa iniciada pelo cliente, a Meta só aceita mensagens de **template pré-aprovado** — configure `WHATSAPP_TEMPLATE_NAME`/`WHATSAPP_TEMPLATE_LANGUAGE` com um template aprovado no [Meta Business Manager](https://business.facebook.com/).
- Números de teste precisam estar na lista de destinatários autorizados enquanto o app estiver em modo de desenvolvimento na Meta.
- Template próprio `confirmacao_agendamento` (pt_BR, categoria UTILITY) **aprovado pela Meta em 2026-07-13** e ativo em produção — `sendWhatsAppTemplateMessage` monta e envia nome do cliente, nome do negócio, data/hora, profissional e serviços automaticamente.

---

## 🧪 Testes

**42 testes automatizados**, cobrindo especialmente o isolamento multi-tenant (a parte mais sensível do sistema):

```bash
npm run test       # Vitest — 18 testes unitários (resolução de hostname, ataques de sufixo, normalização)
npm run test:e2e   # Playwright — 24 testes e2e contra servidor real (precisa do dev server rodando)
```

Cobertura dos testes e2e: resolução de tenant por hostname, isolamento de dados entre tenants (leitura/escrita/IDOR), isolamento de branding, isolamento de autenticação (login/logout, cross-tenant, multi-tenant por usuário), resposta controlada para tenant inexistente/suspenso, e regressão de criação de registros com relações aninhadas.

Prioridades pendentes fora do escopo de tenancy: CRUD de cliente/profissional/serviço, cancelamento, registro de pagamento, entrada no livro-caixa, fechamento de caixa e o fluxo público de auto-agendamento (com e sem conta).

---

## 📦 Deploy em produção

Aplicação em produção em **https://zeloo.net**, rodando como **Node.js standalone** numa VPS própria (Ubuntu 22.04), gerenciada pelo **PM2** e exposta atrás de **Nginx** como reverse proxy (porta 80/443 → `127.0.0.1:3000`), com SSL via Certbot/Let's Encrypt. MySQL 8 roda localmente na mesma VPS. Migrado da hospedagem compartilhada (Hostinger/Passenger) em 2026-07-13/14. **Multi-tenant ativo em produção desde 2026-07-18** (`MULTITENANCY_ENABLED=true`) — runbook completo em [`docs/tenancy/11-deployment-runbook.md`](docs/tenancy/11-deployment-runbook.md), já executado (migrations + backfill + storage migrate rodados contra o banco real). Provisionamento de subdomínio novo (SSL + Nginx) segue manual, um a um, via [`deploy/provisionar-subdominio.sh`](deploy/provisionar-subdominio.sh) — não há DNS/SSL wildcard configurado ainda.

O deploy é **manual** (build local + upload), não automatizado via Git — o diretório da aplicação na VPS **não é um clone git**:

```bash
npm run build   # gera .next/standalone (output: "standalone" no next.config.js)
# copia .next/static para dentro de .next/standalone/.next/static
# empacota (.tar.gz) SEM incluir public/uploads e SEM incluir .env
# envia por scp e extrai por cima do diretório da app na VPS (tar nunca deleta o que não está no pacote)
# aplica migrations pendentes (npx prisma migrate deploy) usando o .env já existente no servidor
# pm2 restart barbearia --update-env
```

Pontos específicos desse ambiente (documentados para reprodutibilidade):

- **`next build` com `output: "standalone"` copia o `.env` do projeto automaticamente para dentro de `.next/standalone/`.** Se o pacote de deploy for montado copiando esse diretório inteiro, o `.env` de desenvolvimento local vai junto e **sobrescreve o `.env` real de produção** na extração — já causou um incidente de indisponibilidade em produção. Sempre remover qualquer `.env*` do pacote antes de compactar, e nunca assumir que "só copiei o build" é seguro.
- **Nunca sobrescrever `public/uploads/` do servidor** — é gitignored. O `tar` só adiciona/sobrescreve arquivos presentes no arquivo compactado e nunca deleta o que não está lá, então basta **não incluir `public/uploads` no pacote** para os uploads reais sobreviverem a qualquer redeploy.
- O Next.js standalone faz a varredura de `public/` **uma única vez, no boot do processo** — qualquer arquivo criado depois (todo upload feito pela aplicação em produção) fica invisível pro roteador interno até o próximo restart completo. Correção: Nginx serve `/uploads/` direto do disco via `location /uploads/ { alias .../public/uploads/; }`, antes do `proxy_pass` pro Node — contorna essa limitação por completo.
- `sharp` precisa dos binários **exatos** de `@img/sharp-linux-x64` e `@img/sharp-libvips-linux-x64` que o `sharp/package.json` pede em `optionalDependencies` — instalar uma versão "aproximada" manualmente (comum ao buildar no Windows e rodar em Linux) quebra upload de imagem com erro genérico "A string was expected".
- `AUTH_URL` precisa usar o protocolo real servido ao navegador (`https://` depois que o SSL estiver ativo) — com HTTPS configurado, Auth.js marca o cookie de sessão como `Secure`, que o navegador recusa silenciosamente numa conexão HTTP simples (sem erro visível em lugar nenhum). `AUTH_TRUST_HOST=true` é necessário atrás do proxy reverso.
- Ao trocar variáveis em `.env` na VPS, sempre `pm2 restart <app> --update-env` — `pm2 restart` sozinho não recarrega o arquivo.
- Exemplo de config Nginx para quando os subdomínios de tenant forem ativados: [`deploy/nginx/zeloo-multitenant.conf.example`](deploy/nginx/zeloo-multitenant.conf.example).

---

## 📁 Estrutura de pastas

```
app/
  (app)/                 # painel interno (autenticado) — agenda, clientes, financeiro...
  agendar/                # vitrine pública de auto-agendamento
  api/health/              # health check (monitoramento, confirma conexão real com o banco)
  login/
  tenant-indisponivel/      # página exibida quando o tenant está suspenso/cancelado
e2e/
  tenant-isolation.spec.ts   # 24 testes e2e de isolamento multi-tenant (Playwright)
docs/tenancy/               # histórico fase a fase da migração multi-tenant + relatório final
deploy/nginx/                # exemplo de config Nginx pra *.zeloo.net
src/
  components/ui/          # Design System (Button, Input, Dialog, Select, ConfirmDialog...)
  components/shared/       # componentes compostos reutilizáveis entre módulos
  modules/
    auth/ users/ clients/ professionals/ services/ appointments/
    finance/ reports/ messages/ settings/ booking/ tenancy/
      actions/ services/ repositories/ schemas/ types/ components/
  lib/
    auth/       # auth.config.ts, permissions.ts, rbac.ts, password.ts
    tenancy/    # resolução de hostname, contexto do tenant, extensão de isolamento do Prisma
    whatsapp/   # cliente da WhatsApp Cloud API
    storage/    # StorageProvider abstrato + LocalStorageProvider (Sharp), segregado por tenant
    prisma.ts   # singleton do Prisma Client (extensões de auditoria + isolamento encadeadas)
  styles/globals.css       # tokens de identidade visual
prisma/
  schema.prisma
  migrations/
  seed.ts                     # RBAC + admin + configurações padrão (npm run prisma:seed)
  seed-demo.ts                 # profissionais/clientes/serviços fictícios
  seed-demo-appointments.ts    # histórico fictício de agendamentos (npm run prisma:seed:demo:appointments)
  tenancy-backfill.ts           # associa dados pré-existentes ao tenant inicial (idempotente)
  tenancy-storage-migrate.ts     # migra uploads existentes pra estrutura segregada por tenant
```

---

## 🗺️ Roadmap

- [x] Ativar multi-tenant em produção (`MULTITENANCY_ENABLED=true`, runbook executado, piloto real em `cezarios.zeloo.net`) — 2026-07-18
- [ ] DNS/SSL wildcard (`*.zeloo.net`) pra parar de provisionar subdomínio um a um via script manual
- [ ] Restringir `tenant_id` como obrigatório (hoje nullable de propósito, ver `docs/tenancy/02-data-migration.md`) agora que a ativação em produção foi validada
- [x] Tela de gestão de tenants (`/plataforma/tenants`) — cadastro, promoção de trial, suspensão/reativação, restrita ao tenant raiz
- [ ] Configurar `eslint.config.js` (ESLint 9 instalado, projeto ainda não migrou do formato antigo — `npm run lint` não funciona hoje)
- [ ] Cancelamento/consulta de agendamento pelo próprio cliente via `/agendar` (link "Ver/cancelar agendamento")
- [ ] Migração de armazenamento local para S3/R2 (interface `StorageProvider` já preparada, prefixo por tenant já embutido)
- [ ] Ampliar a suíte de testes pra além do isolamento multi-tenant: CRUD de cliente/profissional/serviço, agendamento e conflito de horários, pagamento, livro-caixa

---

## 👨‍💻 Desenvolvedor

Desenvolvido por **Anderson A. Barros**

[![Site](https://img.shields.io/badge/site-andersonbarros.dev-000000?style=flat-square&logo=googlechrome&logoColor=white)](https://andersonbarros.dev/)
[![GitHub](https://img.shields.io/badge/GitHub-andersonsilvasilva-181717?style=flat-square&logo=github&logoColor=white)](https://github.com/andersonsilvasilva)
[![Empresa](https://img.shields.io/badge/empresa-High_Tech_Tecnologia-0EA5E9?style=flat-square&logo=buildkite&logoColor=white)](https://hightechtecnologia.com.br/)

---

## 📄 Licença

Projeto privado — todos os direitos reservados. Uso restrito aos negócios (tenants) autorizados na plataforma.
