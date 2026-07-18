# Fase 13 (parte 1) — Runbook de deploy

> Procedimento pra levar esta branch (`feat/multi-tenancy-subdomains`) pra produção (VPS `179.197.71.82`, `zeloo.net`, processo PM2 `barbearia`, `/var/www/barbearia/app`). **Nada disto foi executado** — é o roteiro pra quando o usuário decidir fazer o deploy, com os comandos reais do projeto (não um template genérico). Ver `docs/tenancy/10-infrastructure.md` pro estado real de DNS/SSL/Nginx (wildcard ainda não existe) e `12-rollback-runbook.md` pro caminho de volta.

## 0. Por que duas releases (spec §63)

O código desta branch já está 100% pronto pra multi-tenancy (Fases 1-11), mas a infraestrutura (DNS/SSL wildcard, Nginx `server_name`, Fase 12) ainda não. Publicar tudo de uma vez sem essa infra deixaria `flora.zeloo.net`/etc. inacessíveis (erro de SSL antes mesmo de chegar no Nginx) — não é perigoso, mas não tem por que forçar essa dependência.

O flag `MULTITENANCY_ENABLED` (`middleware.ts`, Fase 13) resolve isso sem precisar de dois deploys de código separados:

- **Release A** = este deploy, com `MULTITENANCY_ENABLED` ausente/`"false"` no `.env` de produção. Todo tráfego (só `zeloo.net`/`www.zeloo.net` hoje, já que não há wildcard) opera como o tenant `zeloo` explicitamente, igual ao comportamento atual — verificado localmente que zero diferença de comportamento pro usuário final (ver `docs/tenancy/09-security-tests.md` §"MULTITENANCY_ENABLED"). O ganho é que os dados de produção já ficam com `tenant_id` preenchido (backfill aplicado) e o schema já com as tabelas novas, sem risco.
- **Release B** = só trocar `MULTITENANCY_ENABLED="false"` → `"true"` no `.env` da VPS + `pm2 restart barbearia --update-env`, **depois** que a Fase 12 (DNS wildcard + SSL wildcard + `server_name *.zeloo.net` no Nginx) estiver aplicada e validada. Nenhum novo build/deploy de código necessário pra essa ativação.

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
# Guardar em local permanente (não a pasta de scratchpad de uma sessão) — a
# lição do backup de 2026-07-16 foi exatamente essa (ver memória do projeto).
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

Só prosseguir pro passo 2 depois que os 6 itens acima estiverem confirmados.

## 2. Release A — deploy do código multi-tenant-ready (comportamento single-tenant)

```bash
# --- build local ---
npm run build                                    # gera .next/standalone
cp -r public .next/standalone/public             # sem sobrescrever public/uploads no pacote final
cp -r .next/static .next/standalone/.next/static
rm -f .next/standalone/.env*                      # NUNCA deixar .env* no pacote (armadilha #4, README/memória)
rm -rf .next/standalone/public/uploads             # NUNCA incluir uploads reais no pacote (armadilha #1)
tar -czf deploy_multitenant.tar.gz -C .next/standalone .

# --- envio ---
scp deploy_multitenant.tar.gz deploy@179.197.71.82:~/

# --- na VPS ---
ssh deploy@179.197.71.82
cp /var/www/barbearia/app/.env ~/.env.backup.$(date +%s)   # backup extra do .env atual, além do dump
cd /var/www/barbearia/app
tar -xzf ~/deploy_multitenant.tar.gz              # tar só adiciona/sobrescreve, uploads/.env reais sobrevivem
```

```bash
# --- migration de expansão (spec §66) — só tabelas novas + tenant_id nullable, aditivo, sem risco de perda de dado ---
npx prisma migrate deploy
# Aplica, nesta ordem, as duas migrations desta branch que ainda não existem
# em produção:
#   20260716142035_add_tenancy_global_models      (Tenant, TenantUser, Plan, PlanFeature, Subscription, TenantLimit, UsageRecord — tabelas novas)
#   20260716154248_tenancy_expand_add_tenant_id    (tenant_id NULLABLE + índice em 18 tabelas existentes — aditivo)
```

```bash
# --- criar o tenant "zeloo" em produção (não existe ainda — só existe local) ---
# Via app/api/tenant-debug (POST) OU diretamente por SQL — preferir SQL aqui
# porque tenant-debug é rota de diagnóstico sem autenticação, não deve ficar
# acessível em produção nem por um instante (ver docs/tenancy/09-security-tests.md).
mysql -u barbearia_app -p barbearia_saas <<'SQL'
INSERT INTO Tenant (id, name, slug, status, createdAt, updatedAt)
VALUES (UUID(), 'Zeloo', 'zeloo', 'ACTIVE', NOW(), NOW());
SQL
# Anotar o id gerado — usado no backfill abaixo.
```

```bash
# --- backfill: dry-run primeiro, SEMPRE ---
TENANT_ID=<id anotado acima> npm run tenancy:backfill -- --dry-run
# Conferir no relatório: contagem por tabela bate com o volume real de
# produção (ex.: comparar com docs/tenancy/02-data-migration.md, que tem os
# números do backfill local — 426 registros — como referência de formato do
# relatório, não os números esperados aqui, que são os de produção).

# --- backfill real, só depois do dry-run conferido ---
TENANT_ID=<id anotado acima> npm run tenancy:backfill -- --apply
# Idempotente (usa "WHERE tenant_id IS NULL") — seguro rodar de novo se
# cair no meio.
```

```bash
# --- migração de storage (uploads existentes -> tenants/{id}/...) ---
TENANT_ID=<id anotado acima> npm run tenancy:storage-migrate
# Verifica checksum SHA-256 de cada arquivo antes de apagar a origem —
# mesmo comportamento já testado localmente na Fase 7.
```

```bash
# --- validação (spec §66) ---
mysql -u barbearia_app -p barbearia_saas -e "
  SELECT 'clients' AS tbl, COUNT(*) total, SUM(tenant_id IS NULL) orfaos FROM clients
  UNION ALL SELECT 'appointments', COUNT(*), SUM(tenant_id IS NULL) FROM appointments
  UNION ALL SELECT 'payments', COUNT(*), SUM(tenant_id IS NULL) FROM payments;
"
# "orfaos" tem que ser 0 em toda linha antes de prosseguir.
```

```bash
# --- ativação (Release A = flag OFF, comportamento idêntico ao anterior) ---
grep -q "^MULTITENANCY_ENABLED=" /var/www/barbearia/app/.env \
  && sed -i 's/^MULTITENANCY_ENABLED=.*/MULTITENANCY_ENABLED="false"/' /var/www/barbearia/app/.env \
  || echo 'MULTITENANCY_ENABLED="false"' >> /var/www/barbearia/app/.env
pm2 restart barbearia --update-env
```

```bash
# --- health check + smoke test ---
curl -s https://zeloo.net/api/health                       # {"status":"ok"}
curl -s -o /dev/null -w "%{http_code}\n" https://zeloo.net/login   # 200
# Login manual real (não só curl) com uma conta de verdade, confirmar que
# clientes/agenda/financeiro aparecem exatamente como antes do deploy.
```

Nenhuma "migration de restrição" (Etapa C, `tenant_id` obrigatório) roda aqui — deliberadamente adiada, ver §0.

## 3. Release B — ativação de subdomínios (só depois da Fase 12 estar pronta e validada)

Pré-requisitos (todos verificáveis, nenhum presumido):

- [ ] DNS wildcard (`* → 179.197.71.82`) criado e propagado (`nslookup teste123.zeloo.net` resolve).
- [ ] Certificado SSL wildcard emitido e instalado (`openssl s_client -connect zeloo.net:443 -servername flora.zeloo.net` fecha handshake sem erro).
- [ ] Nginx com `server_name zeloo.net *.zeloo.net;` aplicado e recarregado (`nginx -t && systemctl reload nginx`).
- [ ] Pelo menos um tenant de teste real criado em produção (via onboarding) e validado manualmente num subdomínio antes de liberar geral.

```bash
ssh deploy@179.197.71.82
sed -i 's/^MULTITENANCY_ENABLED=.*/MULTITENANCY_ENABLED="true"/' /var/www/barbearia/app/.env
pm2 restart barbearia --update-env
curl -s -H "Host: zeloo.net" https://127.0.0.1/api/tenant-debug   # deve continuar "root"/"zeloo"
```

Smoke test pós-ativação: acessar um subdomínio de tenant real via navegador, confirmar branding correto (não o de `zeloo`), confirmar isolamento de dados (mesmo teste manual feito localmente na Fase 4/8), confirmar login/logout mantendo o subdomínio.

## 4. Critérios pra abortar (em qualquer ponto)

- Backup do passo 1 falhou em qualquer item do checklist → não prosseguir.
- `orfaos > 0` depois do backfill → não ativar nada, investigar antes.
- `curl /api/health` retorna `503` ou não responde depois do restart → rollback imediato (`12-rollback-runbook.md`).
- Qualquer erro 500 no smoke test manual → rollback imediato.
