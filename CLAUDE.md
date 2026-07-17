# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

**Zeloo** — full-stack barbershop management system (Next.js 14 App Router + Prisma/MySQL). Two fronts: a public self-booking flow (`app/agendar/`, no login required) and an authenticated internal panel (`app/(app)/`) for the shop's team (agenda, clients, finance, reports, messaging, users/permissions). Production: `https://zeloo.net`, deployed manually (not git-based) to a dedicated VPS via PM2 + Nginx.

The repo is currently on branch `feat/multi-tenancy-subdomains`, mid-migration from single-tenant to multi-tenant-by-subdomain (see "Multi-tenancy" section below) — this is a large, deliberate architectural layer added on top of the original single-tenant app, not yet merged to `main` or deployed to production.

## Commands

```bash
npm run dev                          # dev server (localhost:3000)
npm run build                        # production build (output: "standalone")
npm run test                         # Vitest — unit tests (vitest.config.mts, node environment)
npm run test:watch                   # Vitest watch mode
npm run test:e2e                     # Playwright — e2e tests (playwright.config.ts, needs dev server on :3000)
npx vitest run path/to.test.ts       # single Vitest file
npx playwright test e2e/foo.spec.ts  # single Playwright file
npm run prisma:migrate               # create/apply a dev migration
npm run prisma:generate              # regenerate Prisma Client (also runs on postinstall)
npm run prisma:deploy                # apply pending migrations (production)
npm run prisma:seed                  # RBAC + admin user + default settings
npm run prisma:seed:demo             # fake professionals/clients/services
npm run prisma:seed:demo:appointments
npm run tenancy:backfill -- --dry-run   # multi-tenant data backfill (see prisma/tenancy-backfill.ts)
npm run tenancy:backfill -- --apply
npm run tenancy:storage-migrate      # move existing uploads into tenants/{id}/ prefix
```

**`npm run lint` is currently broken** — ESLint 9 is installed but there is no `eslint.config.js` (flat config), only the old `next lint`-style setup implied by `eslint-config-next`. It fails immediately with "ESLint couldn't find an eslint.config.js file." Don't assume lint passes; use `npx tsc --noEmit` for type-checking instead, which works.

Playwright's `webServer` config reuses an already-running dev server on `:3000` if present (`reuseExistingServer: true`); if `npm run test:e2e` hangs at "Timed out waiting ... from config.webServer", check for a zombie `node.exe` already holding the port (`netstat -ano | grep :3000`) before assuming the app itself is broken — this happens often in this environment because dev servers get left running across sessions.

## Architecture

### Layering (every domain module)

Every feature lives under `src/modules/<name>/` with a fixed layer order that is a hard rule, not a convention — **React components never import the Prisma Client directly**:

```
Component (UI)  →  Action ("use server": session + permission + Zod validation)  →  Service (business rules, transactions)  →  Repository (Prisma)
```

Each module has its own `actions/`, `services/`, `repositories/`, `schemas/` (Zod, shared client/server), `types/`, and sometimes `components/`/`permissions/`. Use `src/modules/appointments/` as the reference implementation of this pattern (Zod schema → action → transactional service with time-conflict checking → repository). The public booking flow (`src/modules/booking/`) never trusts a `clientId` from the form — it resolves the client from the session or re-verifies the submitted phone number against existing records server-side.

### RBAC

Permissions are **data-driven, not hardcoded**: `Role → RolePermission → Permission` in the database, checked via `requirePermission()`/`hasPermission()` in `src/lib/auth/rbac.ts` — never `if (role === "ADMIN")`. Permission constants live in `src/lib/auth/permissions.ts` (e.g. `clients.view`, `finance.create`). This lets the Administrator reconfigure roles from the Usuários screen without a code change. `PROFESSIONAL` must never receive `finance.*` permissions (professionals must not see shop-wide financial data, only their own).

### Prisma Client extension chain (`src/lib/prisma.ts`)

The exported `prisma` singleton is `new PrismaClient().$extends(auditExtension).$extends(tenantExtension)`, cast back to `PrismaClient` so its type doesn't leak the `$extends()`-widened type into the ~15 repositories typed `PrismaOrTx = PrismaClient | Prisma.TransactionClient`. Extension order matters: the last `.$extends()` becomes the outermost layer, so `tenantExtension` (tenant isolation) runs *outside* `auditExtension` (audit logging) — tenant scoping happens first.

- **`src/lib/audit/audit-extension.ts`** — intercepts writes on `AUDITED_MODELS`, records old/new values into `AuditLog`, redacting `User.passwordHash` and Mercado Pago secrets via `redactSensitive()` before serializing.
- **`src/lib/tenancy/tenant-extension.ts`** — deny-by-default multi-tenant isolation (see below).

Scripts that must bypass tenant scoping entirely (seeders, the tenancy backfill/storage-migrate scripts, tenant onboarding) import `PrismaClient` directly from `@prisma/client` instead of the app's `prisma` singleton, and set `tenantId` manually.

### Storage

`src/lib/storage/` defines an abstract `StorageProvider`; only `LocalStorageProvider` (Sharp-based, generates thumb/medium/large variants) is implemented today, chosen via `STORAGE_PROVIDER` env var. Uploads live under `public/uploads/tenants/{tenantId}/<folder>/...`. In production, Nginx serves `/uploads/` directly from disk (`alias`) rather than through Next — the standalone Next server only scans `public/` once at process boot, so files uploaded after boot are otherwise invisible to its router.

### Messaging

`src/lib/whatsapp/whatsapp-client.ts` wraps the WhatsApp Cloud API (Meta). Outside a customer-initiated 24h conversation window, only a pre-approved template message can be sent (`WHATSAPP_TEMPLATE_NAME`/`WHATSAPP_TEMPLATE_LANGUAGE`).

## Multi-tenancy (in progress, branch `feat/multi-tenancy-subdomains`)

The app is being converted from single-tenant to multi-tenant-by-subdomain (`<slug>.zeloo.net`, with the original `zeloo` tenant staying on the root domain `zeloo.net`). This spans the whole stack and is the single most important thing to understand before touching auth, Prisma queries, storage, or middleware in this branch. **`docs/tenancy/*.md` is the authoritative, phase-by-phase record of what was built, tested, and deliberately deferred — read the relevant doc before changing tenancy-adjacent code**, in order: `00-audit.md`, `01-architecture.md`, `01b-tenant-resolver.md`, `02-data-migration.md`, `02b-query-isolation.md`, `03-auth-sessions.md`, `04-cache-jobs.md`, `05-storage.md`, `06-branding-config.md`, `07-onboarding.md`, `08-observability.md`, `09-security-tests.md`, `10-infrastructure.md`.

Key mechanics:

- **Resolution is hostname-based**, done in two stages because Prisma's binary engine can't run in Edge Runtime: `middleware.ts` (Edge) does pure string parsing via `src/lib/tenancy/hostname.ts` (zero dependencies, unit-tested in `hostname.test.ts`) and injects `x-tenant-slug`/`x-tenant-context` headers; `src/lib/tenancy/current-tenant.ts` (Node, `React.cache()`-memoized per request) reads those headers and does the actual DB lookup.
- **`middleware.ts` never calls `NextResponse.redirect()`**, even for logic that looks like it should redirect — only `NextResponse.next()`/direct `Response`. This is a deliberate scar from a real production incident on the old shared hosting (Passenger + Next standalone self-fetch bug); kept as a permanent rule regardless of current hosting.
- **`tenantExtension` (`src/lib/tenancy/tenant-extension.ts`) is deny-by-default**: `HARD_TENANT_MODELS` (17 models) throw `MissingTenantContextError` if no tenant is resolved for the current request; `SOFT_TENANT_MODELS` (just `AuditLog`) attach `tenantId` opportunistically but never block.
- **`MULTITENANCY_ENABLED` env flag** (`middleware.ts`) is the production activation switch: when not `"true"`, every request is forced to the root tenant (`ROOT_TENANT_SLUG`) regardless of hostname — lets the multi-tenant-ready code deploy safely before DNS/SSL wildcard infrastructure exists. Local dev keeps it `"true"` to exercise real subdomain behavior.
- **Migration strategy is expand-then-restrict**: `tenant_id` was added nullable to 18 tables + backfilled (`prisma/tenancy-backfill.ts`, idempotent, `--dry-run`/`--apply`); making it required (`Etapa C`) is deliberately deferred, documented in `02-data-migration.md`. `Setting.key` is still globally unique as a consequence — new tenants get no per-tenant default settings rows, they fall back to empty values instead.
- **Test tenants only exist locally**, never in production: `zeloo` (root, real migrated data), `flora`, `diagro` (fictional, see `docs/tenancy/09-security-tests.md` for credentials and fixture IDs used by `e2e/tenant-isolation.spec.ts`).
- **`app/api/tenant-debug/route.ts`** is an unauthenticated diagnostic route (hostname resolution, data isolation sample, an IDOR probe via `?probeClientId=`) — local-only, must never ship to production without an auth gate.

## Deploy (production, when explicitly requested)

Manual, not git-based: `npm run build` → package `.next/standalone` (+ `.next/static` copied in) → scp → extract over the VPS app directory → `prisma migrate deploy` → `pm2 restart barbearia --update-env`. Load-bearing gotchas (all caused real incidents, see `README.md` for full detail if needed):

- `next build` with `output: "standalone"` copies the local `.env` into `.next/standalone/` automatically — strip any `.env*` from the deploy package before compressing, or it silently overwrites production's real `.env` on extract.
- Never include `public/uploads/` in the deploy package (gitignored, real user-uploaded data) — `tar` extraction only adds/overwrites what's in the archive, so simply omitting the folder is enough to keep production uploads intact.
- After changing `.env` on the VPS, `pm2 restart <app> --update-env` is required — plain `pm2 restart` does not reload the env file.
