# Fase 13 (parte 2) — Runbook de rollback

> Caminho de volta pra cada estágio do `11-deployment-runbook.md`. Nada disto foi executado — é o roteiro pra quando/se for necessário. Regra do spec §65, repetida aqui porque é a mais fácil de violar sob pressão: **nunca remover as colunas `tenant_id` num rollback de aplicação — preservar os dados até confirmação de que não são mais necessários.**

## 1. Rollback de Release B (subdomínios ativados → volta pra Release A)

O mais simples de todos — é exatamente pra isso que o flag existe (spec §64).

```bash
ssh deploy@179.197.71.82
sed -i 's/^MULTITENANCY_ENABLED=.*/MULTITENANCY_ENABLED="false"/' /var/www/barbearia/app/.env
pm2 restart barbearia --update-env
curl -s https://zeloo.net/api/health   # {"status":"ok"}
```

Efeito imediato: todo tráfego volta a operar como o tenant `zeloo` independente do hostname (mesma lógica testada em `docs/tenancy/09-security-tests.md`), sem precisar reverter nenhuma migration nem restaurar backup — os dados de outros tenants (se algum foi criado via onboarding durante o período com o flag ligado) continuam intactos no banco, só inacessíveis via subdomínio até o flag ser religado. **Não é destrutivo.**

Se o problema que motivou o rollback for específico de um tenant (não da ativação em si), considerar suspender só aquele tenant (`Tenant.status = 'SUSPENDED'`, ver `docs/tenancy/06-branding-config.md` — a página `/tenant-indisponivel` já trata esse caso) em vez de desligar o flag geral.

## 2. Rollback de Release A (voltar pro código single-tenant anterior)

Só necessário se o próprio código desta branch causar um problema em produção que o rollback de Release B (§1) não resolve — ou seja, um bug fora da parte "ativável", presente mesmo com o flag desligado.

```bash
# --- restaurar o build anterior (guardar sempre o .tar.gz do deploy anterior, não só o atual) ---
ssh deploy@179.197.71.82
cd /var/www/barbearia/app
pm2 stop barbearia
# Extrair o pacote de build ANTERIOR ao desta migração (o processo de deploy
# de "11-deployment-runbook.md" pressupõe guardar o pacote anterior antes de
# sobrescrever — se isso não foi feito, é preciso rebuildar localmente a
# partir do commit anterior a esta branch: `git checkout main -- .` num
# checkout local separado, `npm run build`, repetir o empacotamento).
tar -xzf ~/deploy_pre_multitenant_backup.tar.gz
pm2 restart barbearia --update-env
```

```bash
# --- rollback das migrations (reversível, spec §65) ---
# As duas migrations desta branch são estritamente aditivas (tabelas novas +
# coluna tenant_id NULLABLE + índice) — nenhuma delas altera ou remove dado
# existente, então o código single-tenant anterior funciona normalmente
# mesmo SEM reverter o schema (ele simplesmente ignora as colunas/tabelas
# novas). Reverter o schema só é necessário se a presença dessas
# tabelas/colunas colidir com alguma checagem do código antigo (não deveria,
# mas confirmar antes de assumir):
mysql -u barbearia_app -p barbearia_saas <<'SQL'
-- Reversão da migration 20260716154248_tenancy_expand_add_tenant_id
-- NÃO EXECUTAR sem necessidade comprovada — preserva tenant_id por padrão (spec §65).
ALTER TABLE clients DROP INDEX clients_tenantId_idx, DROP COLUMN tenantId;
-- repetir só pra tabela(s) que realmente colidem, não todas as 18 de uma vez.
SQL
```

```bash
# --- se o schema precisar voltar 100% ao estado anterior (caso extremo) ---
mysql -u barbearia_app -p barbearia_saas <<'SQL'
DROP TABLE IF EXISTS UsageRecord, TenantLimit, Subscription, PlanFeature, Plan, TenantUser, Tenant;
SQL
# Só depois de confirmar que nenhum tenant real foi criado (checar
# `SELECT COUNT(*) FROM Tenant WHERE slug != 'zeloo'` = 0) — senão isso
# apaga dados de tenants reais sem chance de recuperação por aqui, só pelo
# backup do passo 3.
```

## 3. Restauração do banco a partir do backup (caso extremo — dado corrompido/perdido)

```bash
# Da máquina onde o backup foi guardado (fora da VPS, ver 11-deployment-runbook.md §1):
scp backup_pre_multitenant_*.sql deploy@179.197.71.82:~/
ssh deploy@179.197.71.82
sha256sum -c backup_pre_multitenant_*.sql.sha256   # confirma integridade antes de restaurar
pm2 stop barbearia
mysql -u barbearia_app -p barbearia_saas < backup_pre_multitenant_*.sql
pm2 start barbearia
```

**Isso descarta qualquer dado criado em produção depois do backup** (agendamentos, pagamentos, clientes novos) — só usar se a alternativa for pior (dado corrompido/inconsistente). Preferir sempre os rollbacks §1/§2 primeiro.

## 4. Restauração dos arquivos (uploads)

```bash
scp uploads_pre_multitenant_*.tar.gz deploy@179.197.71.82:~/
ssh deploy@179.197.71.82
sha256sum -c uploads_pre_multitenant_*.tar.gz.sha256
rm -rf /var/www/barbearia/app/public/uploads
tar -xzf ~/uploads_pre_multitenant_*.tar.gz -C /var/www/barbearia/app/public
```

Só necessário se `tenancy:storage-migrate` (passo do Release A) tiver corrompido ou perdido arquivos — o script já verifica checksum antes de apagar a origem, então isso é o cenário de última instância, não o esperado.

## 5. Desativação de wildcard routing e retorno ao hostname anterior

Coberto pelo §1 (flag `MULTITENANCY_ENABLED="false"`) — não existe nenhum estado adicional de "roteamento wildcard" pra desfazer separadamente, porque o Nginx (Fase 12) só teria sido alterado pra `server_name *.zeloo.net` como parte da própria Release B. Se o Nginx já tiver sido alterado e precisar voltar:

```bash
ssh root@179.197.71.82   # mudança de Nginx precisa de root
cp /etc/nginx/sites-available/barbearia /etc/nginx/sites-available/barbearia.multitenant.bak
# restaurar a versão anterior (server_name zeloo.net www.zeloo.net;)
nginx -t && systemctl reload nginx
```

## 6. Verificação de integridade pós-rollback

```bash
curl -s https://zeloo.net/api/health                                  # {"status":"ok"}
curl -s -o /dev/null -w "%{http_code}\n" https://zeloo.net/login      # 200
mysql -u barbearia_app -p barbearia_saas -e "SELECT COUNT(*) FROM clients; SELECT COUNT(*) FROM appointments; SELECT COUNT(*) FROM payments;"
# comparar com os números do backup (passo 1 do deployment runbook) — não pode ser menor.
```
Login manual real (não só curl), conferir agenda/financeiro/clientes voltaram a aparecer normalmente.

## 7. Critérios pra abortar o deploy (repetido do runbook de deploy, vale também durante o rollback)

- Qualquer restauração de banco (§3) sem checksum validado primeiro → abortar, não restaurar arquivo não verificado.
- `DROP TABLE`/`DROP COLUMN` (§2) sem confirmar `Tenant WHERE slug != 'zeloo'` = 0 primeiro → abortar.
- Health check continua falhando depois do rollback completo (§1-§5) → escalar, não repetir os mesmos passos às cegas.
