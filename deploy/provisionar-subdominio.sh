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

# --- 2. Expande o certificado SSL existente (zeloo.net + www) pra incluir este host ---
# --nginx: também atualiza o server_name do Nginx automaticamente.
# --expand: adiciona ao certificado já emitido em vez de tentar criar um novo com o mesmo nome.
echo "--- Emitindo/expandindo certificado SSL (certbot) ---"
certbot --nginx \
  -d "$BASE_DOMAIN" -d "www.$BASE_DOMAIN" -d "$HOSTNAME" \
  --expand --non-interactive --agree-tos -m "$CERTBOT_EMAIL"

# --- 3. Confere sintaxe do Nginx antes de recarregar ---
echo "--- Validando config do Nginx ---"
nginx -t

echo "--- Recarregando Nginx ---"
systemctl reload nginx

# --- 4. Smoke test ---
echo "--- Smoke test ---"
sleep 2
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "https://$HOSTNAME/api/health" --max-time 10 || echo "erro")
echo "GET https://$HOSTNAME/api/health -> $STATUS"

if [ "$STATUS" = "200" ]; then
  echo ""
  echo "✅ $HOSTNAME pronto (SSL + Nginx). Falta só:"
  echo "   1. Criar o tenant '$SLUG' pela tela /plataforma/tenants (se ainda não existir)."
  echo "   2. Confirmar MULTITENANCY_ENABLED=\"true\" no .env da app e reiniciar o PM2, se ainda não estiver ligado."
else
  echo ""
  echo "⚠️  Smoke test não retornou 200 (retornou: $STATUS). Investigar antes de considerar pronto:"
  echo "   - pm2 logs barbearia --lines 30 --nostream"
  echo "   - MULTITENANCY_ENABLED está \"true\" no .env?"
fi
