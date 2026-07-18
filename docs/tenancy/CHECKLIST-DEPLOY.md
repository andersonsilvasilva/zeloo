# Checklist — deploy pra VPS (Release A)

> Objetivo de amanhã: subir o código multi-tenant-ready pra produção **mantendo o comportamento idêntico ao atual** (só o tenant `zeloo`, sem subdomínios ainda — o flag `MULTITENANCY_ENABLED` fica desligado). Testar subdomínios reais **não** está no escopo de amanhã — falta infraestrutura de DNS/SSL wildcard (ver `10-infrastructure.md`). Comandos completos e exatos em `11-deployment-runbook.md`; isto aqui é o roteiro resumido pra seguir na ordem.

## 0. Decisões a tomar antes de começar

- [ ] **Merge da branch `feat/multi-tenancy-subdomains` pra `main`?** Hoje o deploy pode ser feito direto da branch, mas vale decidir se faz o merge antes (histórico mais limpo) ou depois (mais cauteloso, mantém `main` intocada até confirmar que produção está estável). Não fiz essa escolha por você.
- [ ] **Gate ou remoção da rota `app/api/tenant-debug`** — hoje é uma rota de diagnóstico *sem autenticação* (lista dados, permite provisionar tenant). Documentada em vários lugares como "nunca deployar sem gate", mas nada no código bloqueia isso automaticamente. Precisa remover ou proteger antes do build de amanhã.

## 1. Backup (obrigatório, antes de qualquer coisa)

- [ ] Dump completo do banco de produção (`mysqldump`) na VPS
- [ ] Confirmar que o dump não está vazio/truncado
- [ ] Checksum (SHA-256) + registro de quem/quando
- [ ] Backup do `public/uploads` da VPS (tar.gz)
- [ ] Baixar os dois backups pra fora da VPS (máquina local, pasta permanente — não scratchpad)
- [ ] Testar a restauração do dump num banco MySQL isolado (local), confirmar contagens batendo

## 2. Deploy do código

- [ ] `npm run build` local
- [ ] Montar o pacote **sem** `.env*` e **sem** `public/uploads` (armadilhas já documentadas — nunca pular essa checagem)
- [ ] `scp` pro servidor, extrair por cima do diretório da app (backup extra do `.env` atual da VPS antes)

## 3. Migrations e dados no banco de produção

- [ ] `npx prisma migrate deploy` (aplica as 2 migrations de expansão — só tabelas novas + `tenant_id` nullable, nada destrutivo)
- [ ] Criar a linha `Tenant` do `zeloo` em produção (não existe ainda lá)
- [ ] Backfill **dry-run** primeiro, conferir o relatório
- [ ] Backfill **apply** só depois do dry-run conferido
- [ ] Migração de storage (`tenancy:storage-migrate`) — move uploads existentes pra `tenants/{id}/...`
- [ ] Validação: `SELECT` confirmando **zero órfãos** (`tenant_id IS NULL`) em `clients`/`appointments`/`payments`

## 4. Ativação (Release A — flag desligado)

- [ ] `MULTITENANCY_ENABLED="false"` no `.env` da VPS (ou ausente — mesmo efeito)
- [ ] `pm2 restart barbearia --update-env`
- [ ] `curl https://zeloo.net/api/health` → `{"status":"ok"}`
- [ ] `curl -I https://zeloo.net/login` → `200`
- [ ] **Login manual de verdade** (não só curl) — confirmar que clientes/agenda/financeiro aparecem exatamente como antes do deploy

## 5. Critérios pra abortar em qualquer ponto

- [ ] Qualquer item do backup (§1) falhou → não prosseguir
- [ ] Órfãos > 0 depois do backfill → não ativar nada, investigar antes
- [ ] Health check volta `503` ou não responde após o restart → rollback imediato
- [ ] Qualquer erro 500 no smoke test manual → rollback imediato

Procedimento de rollback completo (em camadas, do mais barato ao mais destrutivo) em `12-rollback-runbook.md`.

## Fora do escopo de amanhã (não tentar)

- Ativar `MULTITENANCY_ENABLED="true"` (Release B) — precisa de DNS wildcard + SSL wildcard + Nginx `server_name *.zeloo.net`, nada disso existe ainda.
- Testar `flora.zeloo.net`/qualquer subdomínio em produção — não vai resolver.
- Etapa C (tornar `tenant_id` obrigatório) — fica pra depois de Release B validada com tráfego real.
