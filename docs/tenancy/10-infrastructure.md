# Fase 12 — Nginx, DNS e SSL

> Depende de todas as fases anteriores. **Nada foi aplicado em produção** — só arquivos de exemplo e documentação, conforme instrução explícita do spec (§58: "não afirme que o DNS foi alterado caso não haja acesso ao provedor") e do usuário (nada vai pra produção sem confirmação separada). Verificado o estado real da VPS (`179.197.71.82`, zeloo.net) via `nslookup`/`openssl s_client` direto — só leitura, nada foi alterado.

## 1. Estado real hoje (verificado, não presumido)

- **DNS**: `zeloo.net` resolve pra `179.197.71.82` (A record existente). **Não existe wildcard** — `nslookup qualquercoisa.zeloo.net` retorna `Non-existent domain`. Confirmado via resolver público (`8.8.8.8`), não só cache local.
- **SSL**: certificado Let's Encrypt cobre só `zeloo.net` (emitido `certbot --nginx -d zeloo.net -d www.zeloo.net`, ver memória do projeto), expira 2026-10-11, renovação automática já agendada pelo Certbot **pro certificado atual** — mas isso não resolve o wildcard, que precisa de um método de emissão diferente (§2 abaixo).
- **Nginx**: `server_name zeloo.net www.zeloo.net;` (não `*.zeloo.net`) em `/etc/nginx/sites-available/barbearia` — subdomínios de tenant hoje nem chegam a ser roteados.
- **Conclusão**: pra multi-tenancy por subdomínio funcionar em produção, faltam 3 mudanças de infra reais (DNS wildcard, SSL wildcard, Nginx `server_name`), nenhuma delas de código — a aplicação já está pronta (Fases 1-11) pra receber esse tráfego assim que a infra existir.

## 2. DNS wildcard (spec §58) — não aplicado, instruções abaixo

Registro necessário no provedor de DNS (onde `zeloo.net` está gerenciado hoje):

```text
Tipo: A
Nome: *
Destino: 179.197.71.82
TTL: padrão do provedor (geralmente 3600s ou "automático")
```

Manter os registros existentes (raiz `zeloo.net` e `www.zeloo.net`, já apontando pro IP certo — não mexer). O registro `*` cobre qualquer subdomínio de tenant (`flora.zeloo.net`, `diagro.zeloo.net`, etc.) e também os domínios centrais reservados (`app.`, `admin.`, `api.zeloo.net`) sem precisar de um registro específico pra cada um.

**Não tenho acesso ao provedor de DNS do usuário — este registro não foi criado.** Precisa ser feito manualmente no painel (Hostinger, Cloudflare, registro.br, etc., conforme onde o domínio está hoje).

## 3. SSL wildcard (spec §59) — não aplicado, instruções abaixo

Certificados wildcard **não podem** ser emitidos por validação HTTP-01 (o método que `certbot --nginx` usa por padrão) — só por **DNS-01**, que exige provar controle do domínio criando um registro TXT temporário (`_acme-challenge.zeloo.net`).

Duas formas de fazer isso:

1. **Plugin DNS do Certbot pro provedor específico** (ex.: `certbot-dns-cloudflare`, `certbot-dns-route53` — depende de qual provedor hospeda o DNS de `zeloo.net`). Permite renovação automática de verdade, porque o Certbot cria/remove o TXT sozinho via API do provedor. Exige gerar um token de API com permissão **restrita a edição de DNS** desse domínio (nunca um token de conta inteira) e guardá-lo fora do repositório (ex.: `/etc/letsencrypt/cloudflare.ini` com permissão `600`, nunca commitado). **Este documento não inclui nenhum token real — nenhum foi gerado ou solicitado ao usuário nesta fase.**
2. **Validação manual** (`certbot certonly --manual --preferred-challenges dns`): o Certbot pausa e pede pra criar o TXT manualmente no painel do provedor. Funciona sem plugin, mas **não renova sozinho** — precisa repetir o processo manualmente a cada ~90 dias (Let's Encrypt não permite prazo maior). Só recomendado como solução temporária até decidir o plugin certo.

Comando (qualquer um dos dois métodos, ajustando a flag de challenge):

```bash
sudo certbot certonly --nginx \
  -d zeloo.net -d '*.zeloo.net' \
  --preferred-challenges dns \
  [--dns-cloudflare --dns-cloudflare-credentials /etc/letsencrypt/cloudflare.ini]  # se usar plugin
```

Depois de emitido, o Nginx passa a apontar pra `/etc/letsencrypt/live/zeloo.net/{fullchain,privkey}.pem` normalmente (mesmo caminho de hoje — o Certbot substitui o certificado existente, não cria um diretório novo, desde que o `-d zeloo.net` continue na lista).

**Renovação automática**: só funciona de verdade com o plugin de API (opção 1). Com validação manual (opção 2), configurar um lembrete external (calendário, não cron — não há como automatizar sem a API) pra repetir o processo antes de 2026-10-11 mais qualquer novo prazo de 90 dias a partir da emissão wildcard.

**Nenhum certificado wildcard foi emitido nesta fase** — decisão de qual provedor/plugin usar depende de onde o DNS de `zeloo.net` está hospedado hoje, informação que não foi confirmada nesta sessão.

## 4. Nginx (spec §57)

Arquivo de exemplo: [`deploy/nginx/zeloo-multitenant.conf.example`](../../deploy/nginx/zeloo-multitenant.conf.example). Baseado na config real de produção (`/etc/nginx/sites-available/barbearia`), com as seguintes mudanças pra multi-tenancy:

| Item do checklist (§57) | Como foi coberto |
|---|---|
| HTTP → HTTPS | bloco `listen 80` com `return 301 https://$host$request_uri` pra qualquer host |
| Limites de upload | `client_max_body_size 20m` (logo/favicon/fotos, ver `local-storage-provider.ts`) |
| Timeout de relatórios | `proxy_read_timeout 90s` (dashboard/Contas a Pagar-Receber fazem agregação pesada) |
| Headers de segurança | `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Strict-Transport-Security` |
| WebSocket | não incluído — a app não usa (mesma conclusão já registrada na config real de produção) |
| Health check | `location = /api/health` proxied (rota nova, ver §6) |
| Proteção de arquivos sensíveis | `deny` explícito pra `.env`, `.git`, `*.log`, `*.sql`, `*.bak`, `/backups/` |
| `server_name` | `zeloo.net *.zeloo.net` (cobre `www.zeloo.net` junto, sem precisar listar separado) |
| Uploads | `location /uploads/` com `alias` direto pro disco — **inalterado** em relação à config atual: a Fase 7 só aprofundou o path dentro da mesma raiz (`public/uploads/tenants/{tenantId}/...`), o alias continua servindo a raiz inteira |

Este arquivo **não foi aplicado** em `/etc/nginx/sites-available/barbearia` — é um `.example` pra revisão manual antes de substituir a config real.

## 5. Proxy confiável (spec §60)

`TRUST_PROXY` continua `"false"` também em produção — decisão deliberada, não um esquecimento. O Nginx da VPS já reescreve `Host` pro valor real do navegador (`proxy_set_header Host $host`) antes de repassar ao Node, então `middleware.ts` já recebe o hostname correto sem precisar ler `X-Forwarded-Host`. Não existe CDN nem nenhum outro proxy entre o Nginx e a internet (diferente da hospedagem compartilhada antiga, que tinha o hcdn — ver `project-deploy-pitfalls-hostinger`), então não há motivo legítimo pra confiar nesse header: fazer isso só abriria uma superfície de host header injection sem necessidade (qualquer requisição direta à porta 3000, se algum dia exposta, poderia forjar o tenant). Ver `src/lib/tenancy/hostname.ts` (`resolveRequestHost`) e os 3 testes correspondentes em `hostname.test.ts`.

## 6. Health check (novo, `app/api/health/route.ts`)

Rota pública sem autenticação, `GET /api/health` → `{"status":"ok"}` (200) ou `{"status":"error",...}` (503). Faz `prisma.$queryRaw\`SELECT 1\`` — confirma conexão real com o banco, não só "processo respondendo". Usa `$queryRaw` deliberadamente (não uma leitura de model) porque isso não passa pelas extensões de tenant/auditoria (que só interceptam `$allModels`/`$allOperations`), então funciona mesmo sem nenhum tenant resolvido — não faz sentido esse endpoint depender de contexto de tenant. Testado localmente: `curl http://localhost:3000/api/health` → `{"status":"ok"}`.

## 7. Variáveis de ambiente em produção (checklist pra quando o deploy acontecer)

Já documentadas em `.env.example`; as que mudam de valor entre local e produção:

| Variável | Local | Produção esperada |
|---|---|---|
| `APP_BASE_DOMAIN` | `zeloo.net` | `zeloo.net` (igual) |
| `CENTRAL_DOMAINS` | inclui `zeloo.net` (dev bypass) | mesma lista, sem mudança |
| `TRUST_PROXY` | `false` | `false` (ver §5 — não muda) |
| `AUTH_TRUST_HOST` | `true` | `true` (necessário pra múltiplos hosts, já em uso desde a Fase 5) |
| `AUTH_URL` | não setado/`http://localhost:3000` | `https://zeloo.net` (já é o valor de produção hoje — nenhuma mudança motivada por multi-tenancy) |
| `NODE_ENV` | `development` | `production` (desativa o bypass de `localhost` no middleware, ver `middleware.ts` linha 61) |

## 8. Redis, workers e scheduler

Reafirmado da Fase 6 (`04-cache-jobs.md`): o projeto não tem essa infraestrutura hoje (sem fila de jobs, sem scheduler, sem cache distribuído) — nada a configurar nesta fase.

## 9. Backup externo

Já coberto operacionalmente antes da migração começar (backup de segurança 2026-07-16, dump completo + tag git `pre-multi-tenant-2026-07-16`, ver memória do projeto) — mas isso foi um backup **pontual de pré-migração**, não uma rotina recorrente. Não existe hoje um backup automatizado agendado (cron de `mysqldump`, snapshot da VPS) rodando em produção — fica registrado como lacuna operacional pra Fase 13 (runbooks de deploy/rollback), não resolvido aqui.

## 10. Logs

Reafirmado da Fase 10 (`08-observability.md`): sem infraestrutura de logging estruturado, só `console.log`/`console.error` pontuais + `AuditLog` no banco pras ações de negócio. Em produção, PM2 já centraliza stdout/stderr em `~/.pm2/logs/barbearia-{out,error}.log` (comportamento padrão do PM2, nenhuma configuração extra necessária).

## 11. Critério de conclusão

Todos os itens do checklist do spec (§61: DNS wildcard, SSL wildcard, Nginx, variáveis de ambiente, Redis, workers, scheduler, backup externo, health checks, logs, renovação de certificado) estão documentados com o estado real verificado (não presumido) e o caminho exato pra aplicar quando o usuário decidir ir pra produção. **Nenhuma mudança de DNS, SSL ou Nginx foi aplicada** — só o endpoint de health check (código da aplicação, testado localmente) e os arquivos de exemplo/documentação.
