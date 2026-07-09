# Barbershop SaaS — Sistema de Gestão para Barbearia

Aplicação web completa para gestão operacional, financeira e comercial de uma
barbearia: clientes, barbeiros, serviços, agendamento, financeiro (livro
caixa), relatórios, comunicação (WhatsApp/SMS), usuários e permissões (RBAC).

> **Status deste repositório:** fundação/scaffold gerada — arquitetura,
> schema do banco, RBAC, design system e um fluxo de exemplo completo
> (agendamento) já implementados ponta a ponta. Os demais módulos têm a
> estrutura de pastas e um README próprio descrevendo o que falta
> implementar. Veja "Próximos passos" no fim deste arquivo.

## Stack

- **Frontend:** Next.js 14 (App Router) + TypeScript + Tailwind CSS
- **Backend:** Server Actions / Route Handlers do próprio Next.js, em
  camadas (Action → Service → Repository)
- **Banco de dados:** MySQL 8+ (obrigatório — não usar PostgreSQL)
- **ORM:** Prisma
- **Autenticação:** Auth.js (Credentials; OAuth pode ser adicionado depois)
- **Autorização:** RBAC centralizado (roles + permissions no banco)
- **Validação:** Zod (schemas compartilhados frontend/backend)
- **Formulários:** React Hook Form + Zod Resolver
- **Gráficos:** Recharts
- **Imagens:** Sharp (thumbnail/medium/large) + StorageProvider abstrato
- **Ícones:** Lucide React
- **Datas:** date-fns / date-fns-tz
- **Testes:** Vitest (unitário) + Playwright (e2e)

## Requisitos

- Node.js 20+
- MySQL 8+ rodando localmente ou remoto
- npm (ou pnpm/yarn, ajustando os comandos abaixo)

## Instalação

```bash
npm install
cp .env.example .env
# edite .env com sua string de conexão MySQL e AUTH_SECRET
```

Gere um `AUTH_SECRET`:

```bash
openssl rand -base64 32
```

## Banco de dados

Crie o banco no MySQL:

```sql
CREATE DATABASE barbershop_saas CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

Ajuste `DATABASE_URL` no `.env`:

```
DATABASE_URL="mysql://usuario:senha@localhost:3306/barbershop_saas"
```

## Migrations

```bash
npm run prisma:migrate      # cria as tabelas (dev)
npm run prisma:generate     # gera o Prisma Client
```

Para produção:

```bash
npm run prisma:deploy
```

## Seed

Popula roles, permissions (RBAC), um usuário administrador e configurações
padrão da barbearia:

```bash
npm run prisma:seed
```

Login padrão criado pelo seed:

- **E-mail:** `admin@barbershop.local`
- **Senha:** `Admin@123`

**Troque essa senha imediatamente em produção.**

## Executando em desenvolvimento

```bash
npm run dev
```

Acesse `http://localhost:3000`.

## Build de produção

```bash
npm run build
npm run start
```

## Testes

```bash
npm run test        # Vitest (unitário)
npm run test:e2e     # Playwright (e2e)
```

Prioridades de teste (conforme especificação): login, permissões, cadastro
de cliente/barbeiro/serviço, agendamento, conflito de horários,
cancelamento, registro de pagamento, entrada no livro caixa, fechamento de
caixa.

## Arquitetura

```
src/
  app/                    # rotas do Next.js (App Router)
  components/ui/          # Design System (Button, Input, Modal, DataTable...)
  components/shared/      # componentes compostos reutilizáveis entre módulos
  modules/
    auth/ users/ clients/ barbers/ services/ appointments/
    finance/ reports/ messages/ settings/ media/
      components/ actions/ services/ repositories/ schemas/ types/ permissions/
  lib/
    auth/       # auth.config.ts (Auth.js), permissions.ts, rbac.ts
    storage/    # StorageProvider abstrato + LocalStorageProvider (Sharp)
    prisma.ts   # singleton do Prisma Client
    utils/
  styles/globals.css      # tokens de identidade visual (dourado/preto)
```

**Regra de camadas (obrigatória em todo módulo):**

```
Component (UI)  →  Action (sessão + permissão + validação Zod)
                →  Service (regra de negócio)
                →  Repository (Prisma/MySQL)
```

Nenhum componente React importa o Prisma Client diretamente. Veja o fluxo
de agendamento em `src/modules/appointments/` como referência completa
(schema Zod → action → service com transação e checagem de conflito →
repository).

## RBAC — Controle de Acesso

Roles: `ADMIN`, `BARBER`, `ATTENDANT`, `CASHIER`, `CLIENT`.

Permissions centralizadas em `src/lib/auth/permissions.ts` (ex:
`clients.view`, `finance.create`, `appointments.cancel`...). A checagem
nunca é feita como `if (role === "ADMIN")` — sempre via
`requirePermission()` (`src/lib/auth/rbac.ts`), que consulta a relaçãocelar
Role → RolePermission → Permission no banco. Isso permite que o
Administrador reconfigure permissões pela tela de "Permissões" sem
alterar código.

**Importante:** o perfil `BARBER` nunca recebe permissões `finance.*` —
barbeiros não devem visualizar informações financeiras globais da
barbearia (ver módulo `reports` para os indicadores filtrados por barbeiro).

## Identidade Visual

Paleta definida em `tailwind.config.ts` e `src/styles/globals.css`:

| Token | Cor |
|---|---|
| Primary (dourado) | `#C6A15B` / `#D4AF37` |
| Background | `#080808` |
| Background secundário | `#121212` |
| Card | `#181818` |
| Border | `#2A2A2A` |
| Texto | `#FFFFFF` / `#B5B5B5` |
| Success / Danger / Warning | `#22C55E` / `#EF4444` / `#F59E0B` |

O dourado é usado com moderação (botões primários, ícones, bordas ativas,
seleção) — nunca como grande área de fundo.

## Upload de imagens

Abstração `StorageProvider` (`src/lib/storage/storage-provider.ts`) com
`upload / delete / getUrl / replace`. Implementação padrão:
`LocalStorageProvider`, que usa Sharp para gerar automaticamente as
variantes `thumb` / `medium` / `large` em `/public/uploads`.

Para produção, implemente `S3StorageProvider`, `R2StorageProvider` ou
`SupabaseStorageProvider` seguindo a mesma interface e troque via
`STORAGE_PROVIDER` no `.env` — nenhum módulo de domínio precisa mudar.

Formatos aceitos: PNG, JPG, JPEG, WEBP. Nomes de arquivo são sempre
gerados aleatoriamente (nunca o nome original).

## Estratégia de migração futura para multi-tenant (SaaS)

O sistema foi construído inicialmente para **uma única barbearia**, mas a
arquitetura já evita decisões que bloqueiem uma evolução futura para
multi-tenant:

1. Todas as entidades de negócio (Client, Barber, Service, Appointment,
   CashbookEntry, etc.) já são referenciadas por IDs próprios (cuid), não
   por chaves compostas — facilita adicionar uma coluna `barbershopId`
   posteriormente sem quebrar relacionamentos existentes.
2. Quando necessário, adicionar:
   - Model `Barbershop` (nome, slug, domínio customizado, configurações).
   - Coluna `barbershopId` (indexada) nas tabelas de negócio listadas acima.
   - Middleware do Prisma (`$use`) ou wrapper de repository para injetar
     automaticamente `barbershopId` em toda query, evitando vazamento de
     dados entre tenants.
   - Ajustar `Setting` para ser por barbearia (`barbershopId + key` como
     unique compartilhado), em vez de global.
3. RBAC já é orientado a roles/permissions genéricas — basta vincular
   `UserRole` também a um `barbershopId` para suportar um mesmo usuário
   com papéis diferentes em barbearias diferentes.
4. `StorageProvider` já isola armazenamento por `folder` — usar
   `barbershopId` como prefixo de pasta evita colisão de arquivos entre
   tenants.

## Próximos passos (recomendado no Claude Code)

Este scaffold cobre: schema completo do MySQL, RBAC ponta a ponta, design
system inicial e o módulo `appointments` como referência funcional
completa (schema → action → service transacional com checagem de conflito
→ repository). Para continuar, com um MySQL real disponível:

1. `npm install` e rodar migrations/seed (instruções acima).
2. Implementar CRUDs dos demais módulos seguindo o padrão de
   `appointments` (cada módulo já tem seu `README.md` com o escopo).
3. Construir as páginas do App Router (login, dashboard, clientes,
   barbeiros, serviços, agenda, financeiro, relatórios, mensagens,
   usuários, permissões, configurações, área do cliente — 20 páginas,
   ver especificação original).
4. Integrar provedor real de WhatsApp/SMS (WhatsApp Business API, Twilio,
   Zenvia ou MessageBird) no módulo `messages`.
5. Escrever os testes Vitest/Playwright priorizados na especificação.
