#!/usr/bin/env bash
#
# Provisiona a infraestrutura (SSL + Nginx) pra um subdomínio de tenant
# específico, sem precisar de DNS/SSL wildcard — pensado pra pilotar
# tenants um a um antes de comprometer com o Release B completo (ver
# docs/tenancy/CHECKLIST-DEPLOY.md e 10-infrastructure.md).
#
# NÃO é chamado pela aplicação web (Next.js) de propósito — rodar isso a
# partir da tela do painel exigiria dar ao processo da app (usuário
# "deploy", sem privilégio) permissão de root pra mexer em certificado SSL
# e config do Nginx do sistema inteiro. Risco alto demais pra pouco
# ganho. Fica como script manual, rodado por um humano com acesso à VPS.
#
# Uso (como root, na VPS):
#   sudo bash deploy/provisionar-subdominio.sh <slug>
#
# Exemplo:
#   sudo bash deploy/provisionar-subdominio.sh cezarios
#
# Pré-requisito: o registro DNS do subdomínio (<slug>.zeloo.net -> IP desta
# VPS) já precisa existir e estar propagado ANTES de rodar — o script
# confere isso e aborta se não encontrar.

set -euo pipefail

BASE_DOMAIN="zeloo.net"
NGINX_SITE="/etc/nginx/sites-available/barbearia"
CERTBOT_EMAIL="barrosanderson@gmail.com"

if [ "$(id -u)" -ne 0 ]; then
  echo "Erro: precisa rodar como root (sudo bash $0 <slug>)." >&2
  exit 1
fi

SLUG="${1:-}"
if [ -z "$SLUG" ]; then
  echo "Uso: sudo bash $0 <slug>" >&2
  exit 1
fi

# Mesma regra de validação de src/modules/tenancy/schemas/tenant.schema.ts
# (SLUG_REGEX + RESERVED_TENANT_SLUGS) — mantida em sincronia manualmente,
# não hà importação cruzada possível entre bash e TS aqui.
if ! [[ "$SLUG" =~ ^[a-z0-9]([a-z0-9-]{1,61}[a-z0-9])?$ ]]; then
  echo "Erro: slug inválido. Use só letras minúsculas, números e hífen, começando e terminando com letra ou número (3-63 caracteres)." >&2
  exit 1
fi

RESERVED="www app api admin auth login logout signup register status support suporte mail email financeiro billing static assets cdn files storage health metrics"
for r in $RESERVED; do
  if [ "$SLUG" = "$r" ]; then
    echo "Erro: '$SLUG' é um slug reservado pela plataforma, não pode ser usado como tenant." >&2
    exit 1
  fi
done

HOSTNAME="${SLUG}.${BASE_DOMAIN}"
echo "=== Provisionando infraestrutura pra: $HOSTNAME ==="

# --- 1. Confere que o DNS já resolve pra este servidor ---
MY_IP=$(curl -s -4 https://ifconfig.me || curl -s -4 https://api.ipify.org)
RESOLVED_IP=$(dig +short "$HOSTNAME" @8.8.8.8 | tail -1)

if [ -z "$RESOLVED_IP" ]; then
  echo "Erro: '$HOSTNAME' não resolve em DNS ainda. Crie o registro A (-> $MY_IP) no provedor de DNS e espere propagar antes de rodar este script." >&2
  exit 1
fi

if [ "$RESOLVED_IP" != "$MY_IP" ]; then
  echo "Erro: '$HOSTNAME' resolve pra $RESOLVED_IP, mas o IP desta VPS é $MY_IP. Confira o registro DNS antes de continuar." >&2
  exit 1
fi

echo "DNS confirmado: $HOSTNAME -> $RESOLVED_IP"

# --- 2. Expande o certificado SSL existente pra incluir este host ---
# --nginx: também atualiza o server_name do Nginx automaticamente.
# --expand: NÃO adiciona ao certificado — SUBSTITUI a lista de domínios pela
# que for passada em -d. Achado real (incidente de produção, 2026-07-22):
# rodar isto listando só BASE_DOMAIN + www + o host novo apagou da SAN todo
# subdomínio de tenant provisionado antes (ex.: cezarios.zeloo.net),
# derrubando o HTTPS dele em produção sem aviso nenhum. Correção: sempre
# ler os domínios JÁ no certificado (se ele existir) e somar o host novo,
# nunca listar um subconjunto fixo.
CERT_NAME="$BASE_DOMAIN-0001"
EXISTING_DOMAINS=""
CERT_PATH="/etc/letsencrypt/live/$CERT_NAME/fullchain.pem"
if [ -f "$CERT_PATH" ]; then
  EXISTING_DOMAINS=$(openssl x509 -in "$CERT_PATH" -noout -ext subjectAltName \
    | tr ',' '\n' | grep -o 'DNS:[^ ]*' | cut -d: -f2)
fi

ALL_DOMAINS="$BASE_DOMAIN
www.$BASE_DOMAIN
$HOSTNAME
$EXISTING_DOMAINS"
ALL_DOMAINS=$(echo "$ALL_DOMAINS" | sort -u | grep -v '^$')

CERTBOT_D_ARGS=""
for d in $ALL_DOMAINS; do
  CERTBOT_D_ARGS="$CERTBOT_D_ARGS -d $d"
done

echo "--- Emitindo/expandindo certificado SSL (certbot) --- domínios: $(echo $ALL_DOMAINS | tr '\n' ' ')"
# shellcheck disable=SC2086
certbot --nginx $CERTBOT_D_ARGS \
  --expand --non-interactive --agree-tos -m "$CERTBOT_EMAIL"

# --- 3. Confere sintaxe do Nginx antes de recarregar ---
echo "--- Validando config do Nginx ---"
nginx -t

echo "--- Recarregando Nginx ---"
systemctl reload nginx

# --- 4. Smoke test — testa o host novo E todos os domínios que já
# estavam no certificado, pra pegar na hora qualquer regressão (é assim
# que o incidente de 2026-07-22 teria sido pego automaticamente: o
# certbot criou um bloco novo pro host novo em vez de reaproveitar o
# bloco existente — mesmo com a SAN do certificado correta, o Nginx
# precisa que o host apareça no server_name de um bloco com o
# `proxy_pass`, senão cai num bloco stub que só retorna 404).
echo "--- Smoke test (todos os domínios do certificado) ---"
sleep 2
ANY_FAILED=0
for d in $ALL_DOMAINS; do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" "https://$d/api/health" --max-time 10 || echo "erro")
  echo "GET https://$d/api/health -> $STATUS"
  if [ "$STATUS" != "200" ]; then
    ANY_FAILED=1
  fi
done

if [ "$ANY_FAILED" -eq 0 ]; then
  echo ""
  echo "✅ $HOSTNAME pronto (SSL + Nginx), e todos os domínios existentes continuam OK. Falta só:"
  echo "   1. Criar o tenant '$SLUG' pela tela /plataforma/tenants (se ainda não existir)."
  echo "   2. Confirmar MULTITENANCY_ENABLED=\"true\" no .env da app e reiniciar o PM2, se ainda não estiver ligado."
else
  echo ""
  echo "⚠️  Pelo menos um domínio não retornou 200. Causas conhecidas:"
  echo "   - Host novo com 404: o certbot criou um bloco 'server' separado só pra ele (só acontece se o"
  echo "     host ainda não estava em nenhum server_name antes) — esse bloco novo não tem o proxy_pass"
  echo "     pro Node. Correção manual: em $NGINX_SITE, adicionar '$HOSTNAME' ao server_name do bloco"
  echo "     principal (o que já tem 'proxy_pass http://127.0.0.1:3000') e apagar o bloco stub que o"
  echo "     certbot criou (identifica-se por ter só esse host no server_name e nenhum location/proxy_pass)."
  echo "     Depois: nginx -t && systemctl reload nginx."
  echo "   - Host antigo (que já funcionava) com erro: confira 'openssl x509 -in $CERT_PATH -noout -ext"
  echo "     subjectAltName' pra ver se ele ainda está na lista — se sumiu, rode este script de novo (agora já"
  echo "     inclui os domínios existentes automaticamente no -d, então deve corrigir sozinho)."
  echo "   - pm2 logs barbearia --lines 30 --nostream"
  echo "   - MULTITENANCY_ENABLED está \"true\" no .env?"
fi
