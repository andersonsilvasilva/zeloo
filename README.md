<div align="center">

# 💈 Barbershop SaaS

### Sistema completo de gestão para barbearias — agendamento, financeiro, clientes e muito mais

Aplicação web full-stack para gestão operacional, financeira e comercial de uma barbearia, com um fluxo público de **auto-agendamento** para os clientes finais.

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
[![Deploy](https://img.shields.io/badge/deploy-Hostinger_(Node.js)-673DE6?style=flat-square&logo=hostinger&logoColor=white)](#-deploy-em-produção)
[![Status](https://img.shields.io/badge/status-em_produção-success?style=flat-square)](https://barbearia-io.com.br)
[![License](https://img.shields.io/badge/license-privado-red?style=flat-square)](#-licença)

</div>

---

## 📖 Índice

- [Visão geral](#-visão-geral)
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

O **Barbershop SaaS** cobre o ciclo completo de uma barbearia: da divulgação e captação de clientes (vitrine pública com auto-agendamento) até a gestão interna do dia a dia (agenda, caixa, relatórios, equipe e permissões).

O projeto tem **duas frentes**:

| | |
|---|---|
| 🌐 **Vitrine pública** (`/agendar`) | Cliente final escolhe barbeiro e serviço, se identifica (com ou sem conta) e agenda seu próprio horário — sem precisar de login prévio. |
| 🔐 **Painel interno** (`/`) | Equipe da barbearia (admin, atendente, barbeiro, caixa) gerencia agenda, clientes, financeiro, relatórios, mensagens e usuários, cada um enxergando só o que sua permissão libera. |

---

## ✨ Funcionalidades

### Vitrine pública de agendamento (`/agendar`)
- Landing com logomarca, nome da barbearia e mensagem de marketing configuráveis
- Escolha do barbeiro, seguida de uma página de perfil dele (foto, bio e só os serviços que ele especificamente oferece, com preço e duração)
- Identificação rápida por nome + telefone (sem senha) — com busca automática de cadastro existente pelo telefone (mostra o nome encontrado para o visitante confirmar) — ou criação de conta opcional (e-mail + senha) para acompanhar o histórico depois
- Calendário com disponibilidade em tempo real (reaproveita a mesma lógica de conflito de horário do painel interno) e seleção de horário
- Confirmação com resumo e valor total, com auto-envio de confirmação por WhatsApp quando aplicável

### Painel interno
- **Dashboard** com indicadores do dia/semana/mês/ano, gráficos de faturamento e distribuição de serviços, relógio digital ao vivo com a agenda do dia e box de aniversariantes (hoje/semana/mês)
- **Agenda**: CRUD completo de agendamentos com checagem automática de conflito de horário, fluxo de status (`Pendente → Confirmado → Em atendimento → Concluído`, com `Cancelado`/`Não compareceu`), reagendamento, atalho para registrar pagamento direto na lista e exclusão definitiva restrita ao Administrador (bloqueada se já houver pagamento registrado)
- **Clientes**, **Barbeiros** e **Serviços**: CRUD completo com upload de fotos (thumbnail/média/grande gerados automaticamente)
- **Financeiro**: abertura/fechamento de caixa, livro-caixa (entradas/saídas), registro de pagamentos e **Balancete débito/crédito** por categoria, com impressão/exportação em PDF
- **Relatórios**: indicadores por período customizável (diferente dos buckets fixos do dashboard), com impressão/exportação em PDF — barbeiros veem automaticamente só os próprios números
- **Mensagens**: modelos de mensagem com variáveis dinâmicas (`{{clientName}}`, `{{barber_agendado}}`, `{{resumo_agendamento}}`), envio manual ou automático ao criar/concluir agendamento, e **envio real via WhatsApp Cloud API**
- **Usuários e permissões**: gestão de contas da equipe e papéis (RBAC configurável pela própria interface)
- **Configurações**: logomarca, nome, fuso horário e dados da barbearia

---

## 🛠️ Stack técnica

| Camada | Tecnologia |
|---|---|
| Frontend | Next.js 14 (App Router), React, TypeScript, Tailwind CSS |
| Backend | Server Actions do próprio Next.js, em camadas (`Component → Action → Service → Repository`) |
| Banco de dados | MySQL 8+ |
| ORM | Prisma (engine `binary`, `binaryTargets` para Windows + Linux/Debian) |
| Autenticação | Auth.js v5 (Credentials) |
| Autorização | RBAC centralizado (roles + permissions no banco, sem hardcode de papéis no código) |
| Validação | Zod (schemas compartilhados frontend/backend) |
| Formulários | React Hook Form + Zod Resolver |
| Gráficos | Recharts |
| Imagens | Sharp (variantes thumb/medium/large) + `StorageProvider` abstrato (local hoje, S3/R2/Supabase plugáveis) |
| Mensageria | WhatsApp Cloud API (Meta) |
| Ícones | Lucide React |
| Datas | date-fns / date-fns-tz |
| Testes | Vitest (unitário) + Playwright (e2e) |
| Deploy | Node.js standalone via Passenger (Hostinger) |

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

---

## 🔐 Controle de acesso (RBAC)

| Papel | Escopo |
|---|---|
| `ADMIN` | Acesso total |
| `ATTENDANT` | Clientes, agenda, barbeiros/serviços (leitura) — sem financeiro |
| `BARBER` | Agenda e relatórios **restritos aos próprios atendimentos** — nunca vê financeiro de outros barbeiros |
| `CASHIER` | Financeiro + agenda + clientes |
| `CLIENT` | Auto-agendamento (`/agendar`) |

Permissões centralizadas em `src/lib/auth/permissions.ts` (ex.: `clients.view`, `finance.create`, `appointments.cancel`). A checagem **nunca** é feita como `if (role === "ADMIN")` — sempre via `requirePermission()` (`src/lib/auth/rbac.ts`), que consulta a relação `Role → RolePermission → Permission` no banco. Isso permite ao Administrador reconfigurar permissões pela própria tela de **Usuários**, sem alterar código.

> **Regra de negócio importante:** o papel `BARBER` nunca recebe permissões `finance.*` — barbeiros não devem visualizar informações financeiras globais da barbearia.

---

## 🚀 Como rodar localmente

**Pré-requisitos:** Node.js 20+, MySQL 8+, npm.

```bash
git clone https://github.com/andersonsilvasilva/barbearia.git
cd barbearia
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

Acesse `http://localhost:3000`.

**Login padrão criado pelo seed** (troque a senha imediatamente em produção):

- E-mail: `admin@barbershop.local`
- Senha: `Admin@123`

---

## 🔧 Variáveis de ambiente

| Variável | Descrição |
|---|---|
| `DATABASE_URL` | String de conexão MySQL |
| `AUTH_SECRET` | Chave do Auth.js (`openssl rand -base64 32`) |
| `AUTH_URL` | URL pública da aplicação |
| `AUTH_TRUST_HOST` | `true` quando atrás de proxy (produção) |
| `STORAGE_PROVIDER` | `local` \| `s3` \| `r2` \| `supabase` |
| `WHATSAPP_BUSINESS_API_TOKEN` | Token da WhatsApp Cloud API (Meta) |
| `WHATSAPP_PHONE_NUMBER_ID` | Phone Number ID cadastrado na Meta |
| `WHATSAPP_TEMPLATE_NAME` / `WHATSAPP_TEMPLATE_LANGUAGE` | Template aprovado na Meta para envio automático |
| `TWILIO_*` / `ZENVIA_API_TOKEN` | Provedores alternativos de SMS (opcional, não integrado ainda) |

Veja todos os valores de exemplo em [`.env.example`](.env.example).

---

## 🗄️ Banco de dados

Schema completo em [`prisma/schema.prisma`](prisma/schema.prisma) — 20 models cobrindo autenticação/RBAC, clientes, barbeiros, serviços, agendamentos, financeiro, mensageria, mídia e auditoria.

```bash
npm run prisma:migrate     # aplica migrations em dev
npm run prisma:deploy      # aplica migrations em produção
npm run prisma:generate    # gera o Prisma Client
```

> **Nota sobre hospedagem compartilhada:** em ambientes com restrições de sandbox (ex.: CageFS da Hostinger), rodar `prisma migrate deploy` direto pode falhar com múltiplas instruções SQL em lote — nesse caso, aplique a migration instrução por instrução (ver histórico do projeto) ou rode as migrations num ambiente com acesso irrestrito ao banco.

---

## 🎭 Dados fictícios (seed de demonstração)

```bash
npm run prisma:seed:demo               # barbeiros, clientes, serviços, equipe de teste
npm run prisma:seed:demo:appointments  # histórico de agendamentos/pagamentos (últimos ~60 dias + próximos dias)
```

Usuários fictícios (barbeiros/atendentes/caixa) usam a senha `Teste@123`.

---

## 💬 Integração com WhatsApp

O envio de mensagens (confirmação automática de agendamento, modelos manuais) usa a **WhatsApp Cloud API** da Meta (`src/lib/whatsapp/whatsapp-client.ts`).

Pontos de atenção:
- Fora da janela de 24h de uma conversa iniciada pelo cliente, a Meta só aceita mensagens de **template pré-aprovado** — configure `WHATSAPP_TEMPLATE_NAME`/`WHATSAPP_TEMPLATE_LANGUAGE` com um template aprovado no [Meta Business Manager](https://business.facebook.com/).
- Números de teste precisam estar na lista de destinatários autorizados enquanto o app estiver em modo de desenvolvimento na Meta.
- Template próprio `confirmacao_agendamento` (pt_BR, categoria UTILITY) submetido para aprovação em 2026-07-11, com variáveis para nome do cliente, nome da barbearia, data/hora, barbeiro e serviços — `sendWhatsAppTemplateMessage` já monta e envia esses valores quando o template ativo não é o `hello_world` de exemplo.

---

## 🧪 Testes

Vitest e Playwright já estão nas dependências, mas ainda **não há uma suíte de testes automatizados commitada** — a validação de cada funcionalidade nesta fase foi feita via scripts Playwright avulsos (fluxo completo no navegador) durante o desenvolvimento, descartados após o uso. Escrever a suíte definitiva é o próximo passo natural (ver [Roadmap](#-roadmap)).

Prioridades sugeridas: login e permissões, CRUD de cliente/barbeiro/serviço, agendamento e conflito de horários, cancelamento, registro de pagamento, entrada no livro-caixa, fechamento de caixa e o fluxo público de auto-agendamento (com e sem conta).

---

## 📦 Deploy em produção

Aplicação em produção em **https://barbearia-io.com.br**, rodando como **Node.js standalone** via **Phusion Passenger** (hospedagem compartilhada Hostinger, sem seletor de Node.js no painel — runtime acessado diretamente via `/opt/alt/alt-nodejs20`). Migrado da hospedagem original em 2026-07-11 (mesma arquitetura, conta/servidor diferentes).

O deploy é **manual** (build local + upload), não automatizado via Git:

```bash
npm run build   # gera .next/standalone (output: "standalone" no next.config.js)
# copia .next/static e public/ para dentro de .next/standalone
# empacota (.tar.gz) e envia por scp/FTP para o servidor
# extrai em app_deploy/, restaura .env e public/uploads do servidor
# chmod +x nos binários do Prisma, toca app_deploy/tmp/restart.txt
```

Pontos específicos desse ambiente (documentados para reprodutibilidade):

- `.htaccess` com as diretivas do Passenger é **versionado no repositório** como referência do valor correto (caminho `PassengerAppRoot`, versão do Node) — mas precisa ser recriado manualmente em `public_html/` na hospedagem, já que não há auto-deploy via Git ativo.
- **Nunca sobrescrever `public/uploads/` do servidor com a pasta local** — é gitignored e só tem arquivos de teste localmente; todo deploy precisa fazer backup do `app_deploy/public/uploads` do servidor antes de extrair o novo pacote, e restaurar depois (mesmo padrão já usado para o `.env`).
- Páginas públicas estáticas (`/login`, `/agendar`, `/agendar/escolher`) recebem `Cache-Control: no-store` via `headers()` em `next.config.js` — sem isso, o CDN da Hostinger cacheia o HTML por 1 ano e visitantes recebem chunks JS/CSS já apagados após um redeploy. **Não usar `force-dynamic`** como alternativa: essa hospedagem trava com `EAGAIN` do Prisma sob esse padrão de carga.
- `middleware.ts` não faz nenhum redirect (`NextResponse.redirect()` em middleware, nesse ambiente Passenger, trava a requisição — bug do Next.js em `output: standalone`). O controle de acesso por autenticação é feito via `redirect()` do `next/navigation` em `app/(app)/layout.tsx`.
- `sharp` precisa do binário `linux-x64` explícito ao buildar no Windows (`npm install --no-save --force @img/sharp-linux-x64@<versão> @img/sharp-libvips-linux-x64@<versão>` antes do build) — só o binário `win32-x64` fica no `node_modules` local por padrão, e o app quebra em qualquer rota que use upload de imagem.
- `engineType = "binary"` no `generator client` do Prisma — o engine `library` (addon nativo embutido) trava com `PANIC: timer has gone away` no sandbox da hospedagem; o engine binário (processo separado) contorna a restrição.
- O build (`next build`) não roda de forma confiável direto no servidor compartilhado (o compilador SWC/Rust esbarra em restrições de processos do sandbox) — o build é feito localmente e o pacote (`.next/standalone` + `.next/static` + `public/`) é enviado pronto.
- Erro 503 com `Assertion failed: uv_thread_create` no log é esgotamento de threads da conta (limite de recursos do plano) — não tem solução via código, precisa aumentar recursos da hospedagem.

---

## 📁 Estrutura de pastas

```
app/
  (app)/                 # painel interno (autenticado) — agenda, clientes, financeiro...
  agendar/                # vitrine pública de auto-agendamento
  login/
src/
  components/ui/          # Design System (Button, Input, Dialog, Select...)
  components/shared/       # componentes compostos reutilizáveis entre módulos
  modules/
    auth/ users/ clients/ barbers/ services/ appointments/
    finance/ reports/ messages/ settings/ booking/
      actions/ services/ repositories/ schemas/ types/ components/
  lib/
    auth/       # auth.config.ts, permissions.ts, rbac.ts, password.ts
    whatsapp/   # cliente da WhatsApp Cloud API
    storage/    # StorageProvider abstrato + LocalStorageProvider (Sharp)
    prisma.ts   # singleton do Prisma Client
  styles/globals.css       # tokens de identidade visual
prisma/
  schema.prisma
  migrations/
  seed.ts                     # RBAC + admin + configurações padrão (npm run prisma:seed)
  seed-demo.ts                 # barbeiros/clientes/serviços fictícios
  seed-demo-appointments.ts    # histórico fictício de agendamentos (npm run prisma:seed:demo:appointments)
```

---

## 🗺️ Roadmap

- [ ] Suíte de testes automatizados (Vitest + Playwright já instalados, faltam os testes em si)
- [ ] Aguardando aprovação da Meta do template `confirmacao_agendamento` (pt_BR, categoria UTILITY, submetido em 2026-07-11) — código já pronto para usá-lo assim que `WHATSAPP_TEMPLATE_NAME` for atualizado; até lá continua no `hello_world` de exemplo
- [ ] Cancelamento/consulta de agendamento pelo próprio cliente via `/agendar` (link "Ver/cancelar agendamento")
- [ ] Migração de armazenamento local para S3/R2 (interface `StorageProvider` já preparada)
- [ ] Estratégia multi-tenant (suportar múltiplas barbearias na mesma base — ver anotações de arquitetura no código)
- [ ] Consolidar `prisma/seed-appointments.ts` (sem script no `package.json`) e `prisma/seed-demo-appointments.ts` (script `prisma:seed:demo:appointments`) — dois scripts com propósito parecido, resultado de iterações diferentes

---

## 👨‍💻 Desenvolvedor

Desenvolvido por **Anderson A. Barros**

[![Site](https://img.shields.io/badge/site-andersonbarros.dev-000000?style=flat-square&logo=googlechrome&logoColor=white)](https://andersonbarros.dev/)
[![GitHub](https://img.shields.io/badge/GitHub-andersonsilvasilva-181717?style=flat-square&logo=github&logoColor=white)](https://github.com/andersonsilvasilva)
[![Empresa](https://img.shields.io/badge/empresa-High_Tech_Tecnologia-0EA5E9?style=flat-square&logo=buildkite&logoColor=white)](https://hightechtecnologia.com.br/)

---

## 📄 Licença

Projeto privado — todos os direitos reservados. Uso restrito à barbearia proprietária.

