# Fase 13 (parte 1) — Runbook de deploy

> Procedimento pra levar esta branch (`feat/multi-tenancy-subdomains`, já mergeada em `main`) pra produção (VPS `179.197.71.82`, `zeloo.net`, processo PM2 `barbearia`, `/var/www/barbearia/app`). **Release A executado com sucesso em 2026-07-18** — este documento foi atualizado depois do fato pra corrigir os pontos em que o roteiro original não batia com a realidade (sintaxe de comandos, artefatos que faltavam no pacote). Ver `docs/tenancy/10-infrastructure.md` pro estado real de DNS/SSL/Nginx (wildcard ainda não existe) e `12-rollback-runbook.md` pro caminho de volta.

## 0. Por que duas releases (spec §63)

O código desta branch já está 100% pronto pra multi-tenancy (Fases 1-11), mas a infraestrutura (DNS/SSL wildcard, Nginx `server_name`, Fase 12) ainda não. Publicar tudo de uma vez sem essa infra deixaria `flora.zeloo.net`/etc. inacessíveis (erro de SSL antes mesmo de chegar no Nginx) — não é perigoso, mas não tem por que forçar essa dependência.

O flag `MULTITENANCY_ENABLED` (`middleware.ts`, Fase 13) resolve isso sem precisar de dois deploys de código separados:

- **Release A** = este deploy, com `MULTITENANCY_ENABLED="false"` no `.env` de produção. Todo tráfego (só `zeloo.net`/`www.zeloo.net` hoje, já que não há wildcard) opera como o tenant `zeloo` explicitamente, igual ao comportamento atual — confirmado em produção que zero diferença de comportamento pro usuário final (login manual real conferido pelo usuário em 2026-07-18). O ganho é que os dados de produção já ficam com `tenant_id` preenchido (backfill aplicado) e o schema já com as tabelas novas, sem risco.
- **Release B** = só trocar `MULTITENANCY_ENABLED="false"` → `"true"` no `.env` da VPS + `pm2 restart barbearia --update-env`, **depois** que a Fase 12 (DNS wildcard + SSL wildcard + `server_name *.zeloo.net` no Nginx) estiver aplicada e validada. Nenhum novo build/deploy de código necessário pra essa ativação. **Ainda não feito.**

Isso também é o motivo de não seguir literalmente o "Release B: restringe tenant_id" do spec — Etapa C (tornar `tenant_id` obrigatório) fica pra depois de Release B estar validada em produção com tráfego real multi-tenant por um tempo, não acoplada à ativação do flag.

## 1. Backup obrigatório (spec §62) — antes de QUALQUER migration em produção

Checklist, todos os itens obrigatórios antes de prosseguir pro passo 2:

```bash
# 1. Backup completo do banco (mesmo padrão já usado nas migrações anteriores desta VPS)
ssh deploy@179.197.71.82
mysqldump --column-statistics=0 --routines --triggers --single-transaction \
  -u barbearia_app -p barbearia_saas > backup_pre_multitenant_$(date +%Y%m%d_%H%M%S).sql

# 2. Verificar que o arquivo não está vazio nem truncado
ls -lh backup_pre_multitenant_*.sql   # tamanho > 0, compatível com dumps anteriores
tail -c 200 backup_pre_multitenant_*.sql   # deve terminar com "-- Dump completed on ..."

# 3. Checksum + registro (data, responsável, hash — spec exige os 3)
sha256sum backup_pre_multitenant_*.sql > backup_pre_multitenant_*.sql.sha256
echo "Backup criado em $(date -Iseconds) por $(whoami)" >> backup_pre_multitenant_*.sql.sha256

# 4. Backup dos uploads
tar -czf uploads_pre_multitenant_$(date +%Y%m%d_%H%M%S).tar.gz -C /var/www/barbearia/app/public uploads
sha256sum uploads_pre_multitenant_*.tar.gz >> uploads_pre_multitenant_*.tar.gz.sha256

# 5. Armazenamento FORA da VPS (spec §62 — obrigatório, não deixar só local ao servidor)
# Rodar da máquina local, não da VPS:
scp deploy@179.197.71.82:~/backup_pre_multitenant_*.sql* .
scp deploy@179.197.71.82:~/uploads_pre_multitenant_*.tar.gz* .
# Guardar em local permanente (não a pasta de scratchpad de uma sessão).
```

```bash
# 6. Teste de restauração em ambiente ISOLADO (nunca contra o banco de produção)
# Local, contra um MySQL de teste separado do banco de dev/staging:
mysql -u root -p -e "CREATE DATABASE restore_test;"
mysql -u root -p restore_test < backup_pre_multitenant_*.sql
mysql -u root -p restore_test -e "SELECT COUNT(*) FROM clients; SELECT COUNT(*) FROM appointments;"
# Confere que os números batem com o que se espera de produção antes de seguir.
mysql -u root -p -e "DROP DATABASE restore_test;"
```

Só prosseguir pro passo 2 depois que os 6 itens acima estiverem confirmados. **Nota de aviso conhecida** (não é falha real): `mysqldump` reclama `Access denied ... PROCESS privilege` sobre tablespaces se o usuário do banco não for superusuário — o dump completa normalmente mesmo assim (confirmado pelo `-- Dump completed on ...` no final e pela restauração isolada batendo).

## 2. Release A — deploy do código multi-tenant-ready (comportamento single-tenant)

```bash
# --- build local ---
npm run build                                    # gera .next/standalone
cp -r public/. .next/standalone/public/          # sem sobrescrever public/uploads no pacote final
cp -r .next/static .next/standalone/.next/static
rm -f .next/standalone/.env*                      # NUNCA deixar .env* no pacote (armadilha #4, README/memória)
rm -rf .next/standalone/public/uploads             # NUNCA incluir uploads reais no pacote (armadilha #1)
tar -czf deploy_multitenant.tar.gz -C .next/standalone .
tar -tzf deploy_multitenant.tar.gz | grep -iE "\.env|uploads/"   # tem que vir vazio -- checagem final antes de enviar

# --- envio ---
scp deploy_multitenant.tar.gz deploy@179.197.71.82:~/

# --- na VPS ---
ssh deploy@179.197.71.82
cp /var/www/barbearia/app/.env ~/.env.backup.$(date +%s)   # backup extra do .env atual, além do dump
cd /var/www/barbearia/app
tar -xzf ~/deploy_multitenant.tar.gz              # tar só adiciona/sobrescreve, uploads/.env reais sobrevivem
```

### 2.1 Artefatos que o build standalone NÃO inclui (achado real, 2026-07-18)

O build `output: standalone` do Next **não traz** `prisma/migrations/` nem `prisma/schema.prisma` como arquivo solto (só a cópia interna em `node_modules/.prisma/client/schema.prisma`, sem as migrations), nem a CLI `prisma`/`tsx`, nem pacotes que os *scripts* de backfill/storage-migrate importam mas o app em runtime não usa (ex. `zod`, puxado por `src/modules/tenancy/schemas/tenant.schema.ts`). Sem isso, `prisma migrate deploy` na VPS via `npx` funciona (baixa a CLI sob demanda), mas os scripts de backfill/storage-migrate falham com `Cannot find module`. Enviar antes de continuar:

```bash
# --- do lado local ---
tar -czf prisma_folder.tar.gz prisma/schema.prisma prisma/migrations prisma/tenancy-backfill.ts prisma/tenancy-storage-migrate.ts
tar -czf tenancy_schema.tar.gz src/modules/tenancy/schemas/tenant.schema.ts
scp prisma_folder.tar.gz tenancy_schema.tar.gz deploy@179.197.71.82:~/

# --- na VPS, dentro de /var/www/barbearia/app ---
tar -xzf ~/prisma_folder.tar.gz
tar -xzf ~/tenancy_schema.tar.gz
ls node_modules | grep -q '^zod$' || { echo 'zod ausente -- enviar node_modules/zod local via scp+tar antes de continuar'; }
npx prisma@5.18.0 migrate status   # deve listar as migrations novas como pendentes, não "up to date" com um número menor de migrations do que o local
```

### 2.2 Variáveis de ambiente de tenancy — checar ANTES de reiniciar (achado real, 2026-07-18)

No primeiro Release A, o `.env` de produção não tinha **nenhuma** variável de tenancy. Sem `ROOT_TENANT_SLUG` especificamente, o middleware com o flag desligado ainda assim define o header do slug do tenant como string vazia — quebraria o site inteiro assim que o PM2 reiniciasse (toda leitura de modelo tenant-owned lançaria `MissingTenantContextError`). Checar com `grep MULTITENANCY_ENABLED .env`; se não existir nada, adicionar (valores completos em `.env.example`):

```bash
cat >> /var/www/barbearia/app/.env <<'VARS'

# Multi-tenant (Release A)
MULTITENANCY_ENABLED="false"
APP_BASE_DOMAIN="zeloo.net"
TENANCY_MODE="subdomain"
ROOT_TENANT_SLUG="zeloo"
DEFAULT_TENANT_SLUG=""
CENTRAL_DOMAINS="zeloo.net,www.zeloo.net,app.zeloo.net,admin.zeloo.net,api.zeloo.net"
TRUST_PROXY="false"
TENANT_CACHE_PREFIX="tenant"
TENANT_STORAGE_PREFIX="tenants"
VARS
```

```bash
# --- migration de expansão (spec §66) — só tabelas novas + tenant_id nullable/constraints, aditivo, sem risco de perda de dado ---
npx prisma@5.18.0 migrate deploy
```

```bash
# --- criar o tenant "zeloo" em produção (não existe ainda — só existe local) ---
# Direto por SQL -- app/api/tenant-debug (POST) NÃO é mais uma opção: a
# rota responde 404 em produção (NODE_ENV=production) desde a Fase 14/pré-deploy,
# de propósito. Nome da tabela é `tenants` (minúsculo, plural -- @@map do
# Prisma), colunas em snake_case, não o nome literal dos campos do schema.
mysql -u barbearia_app -p barbearia_saas -e "
  INSERT INTO tenants (id, name, slug, status, timezone, locale, created_at, updated_at)
  VALUES (SUBSTRING(MD5(RAND()), 1, 25), 'Zeloo', 'zeloo', 'ACTIVE', 'America/Sao_Paulo', 'pt-BR', NOW(3), NOW(3));
  SELECT id, name, slug, status FROM tenants;
"
```

```bash
# --- backfill: dry-run primeiro, SEMPRE ---
# Sintaxe real do script (ver cabeçalho de prisma/tenancy-backfill.ts) é
# --slug=/--name=, NÃO uma variável de ambiente TENANT_ID. Reaproveita o
# tenant já criado no passo anterior pelo slug -- não precisa de --name
# porque ele já existe.
npx tsx@4.23.0 prisma/tenancy-backfill.ts --slug=zeloo --dry-run
# Conferir no relatório: contagem por tabela bate com o volume real de
# produção (comparar com o dump de backup do passo 1).

# --- backfill real, só depois do dry-run conferido ---
npx tsx@4.23.0 prisma/tenancy-backfill.ts --slug=zeloo --apply
# Idempotente (usa "WHERE tenant_id IS NULL") — seguro rodar de novo se
# cair no meio. O próprio relatório final já mostra "sem_tenant_depois"
# por tabela -- tem que ser 0 em todas.
```

```bash
# --- migração de storage (uploads existentes -> tenants/{id}/...) ---
npx tsx@4.23.0 prisma/tenancy-storage-migrate.ts --dry-run   # confere a lista antes
npx tsx@4.23.0 prisma/tenancy-storage-migrate.ts --apply
# Verifica checksum SHA-256 de cada arquivo antes de apagar a origem —
# mesmo comportamento já testado localmente na Fase 7. Nginx serve
# /uploads/ direto do disco (alias na raiz public/uploads/), então os
# arquivos migrados continuam acessíveis sem NENHUMA mudança de config do
# Nginx -- confirmar com um curl direto num arquivo já migrado.
```

```bash
# --- validação (spec §66) ---
mysql -u barbearia_app -p barbearia_saas -e "
  SELECT 'clients' AS tbl, COUNT(*) total, SUM(tenant_id IS NULL) orfaos FROM clients
  UNION ALL SELECT 'appointments', COUNT(*), SUM(tenant_id IS NULL) FROM appointments
  UNION ALL SELECT 'payments', COUNT(*), SUM(tenant_id IS NULL) FROM payments
  UNION ALL SELECT 'media', COUNT(*), SUM(tenant_id IS NULL) FROM media;
"
# "orfaos" tem que ser 0 em toda linha antes de prosseguir.
```

```bash
# --- ativação (Release A = flag OFF, comportamento idêntico ao anterior) ---
# Se o passo 2.2 já deixou MULTITENANCY_ENABLED="false" no .env, só falta o restart:
pm2 restart barbearia --update-env
```

```bash
# --- health check + smoke test ---
curl -s https://zeloo.net/api/health                       # {"status":"ok"}
curl -s -o /dev/null -w "%{http_code}\n" https://zeloo.net/login   # 200
curl -s -o /dev/null -w "%{http_code}\n" -L https://zeloo.net/     # 200
curl -s -o /dev/null -w "%{http_code}\n" https://zeloo.net/agendar # 200
pm2 logs barbearia --lines 30 --nostream   # "Failed to find Server Action" isolado é ruído benigno
                                            # (aba antiga do navegador reenviando ação de build anterior),
                                            # não é critério de abortar sozinho
# Login manual real (não só curl) com uma conta de verdade, confirmar que
# clientes/agenda/financeiro aparecem exatamente como antes do deploy.
```

Nenhuma "migration de restrição" (Etapa C, `tenant_id` obrigatório) roda aqui — deliberadamente adiada, ver §0.

## 3. Release B — ativação de subdomínios (só depois da Fase 12 estar pronta e validada)

**Ainda não executado.** Pré-requisitos (todos verificáveis, nenhum presumido):

- [ ] DNS wildcard (`* → 179.197.71.82`) criado e propagado (`nslookup teste123.zeloo.net` resolve).
- [ ] Certificado SSL wildcard emitido e instalado (`openssl s_client -connect zeloo.net:443 -servername flora.zeloo.net` fecha handshake sem erro).
- [ ] Nginx com `server_name zeloo.net *.zeloo.net;` aplicado e recarregado (`nginx -t && systemctl reload nginx`).
- [ ] Pelo menos um tenant de teste real criado em produção (via `/plataforma/tenants`, logado como admin do zeloo) e validado manualmente num subdomínio antes de liberar geral.

```bash
ssh deploy@179.197.71.82
sed -i 's/^MULTITENANCY_ENABLED=.*/MULTITENANCY_ENABLED="true"/' /var/www/barbearia/app/.env
pm2 restart barbearia --update-env
curl -s -H "Host: zeloo.net" https://127.0.0.1/api/health   # confere que o domínio raiz continua respondendo
```

Smoke test pós-ativação: acessar um subdomínio de tenant real via navegador, confirmar branding correto (não o de `zeloo`), confirmar isolamento de dados (mesmo teste manual feito localmente na Fase 4/8), confirmar login/logout mantendo o subdomínio.

## 4. Critérios pra abortar (em qualquer ponto)

- Backup do passo 1 falhou em qualquer item do checklist → não prosseguir.
- `orfaos > 0` depois do backfill → não ativar nada, investigar antes.
- `curl /api/health` retorna `503` ou não responde depois do restart → rollback imediato (`12-rollback-runbook.md`).
- Qualquer erro 500 no smoke test manual → rollback imediato.

## 5. Registro do Release A executado (2026-07-18)

- Tenant `zeloo` criado com id `fa3e807682404e5eb6be73f10`.
- Backfill: 18 tabelas, 0 órfãos em todas depois (`userRole` 8, `client` 16, `professional` 6, `service` 25, `appointment` 92, `payment` 73, `pixCharge` 2, `cashbookEntry` 80, `cashRegister` 1, `accountEntry` 35, `commissionClosing` 1, `messageTemplate` 1, `messageLog` 8, `media` 35, `setting` 15, `auditLog` 305).
- Storage: 35 arquivos migrados pra `tenants/fa3e807682404e5eb6be73f10/...`, sem falhas.
- `MULTITENANCY_ENABLED="false"` confirmado ativo — comportamento idêntico ao pré-deploy, validado por health check, smoke test automatizado e login manual real do usuário.
