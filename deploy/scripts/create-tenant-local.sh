#!/usr/bin/env bash
set -euo pipefail

source deploy/.env 2>/dev/null || true

SLUG="${1:?Usage: $0 <slug> <display_name>}"
NAME="${2:?Usage: $0 <slug> <display_name>}"
SUPER_KEY="${SUPER_ADMIN_KEY:-dev_super_admin_key}"
ADMIN="http://localhost:8081"

echo "→ Создаю тенант: $SLUG ($NAME)"
echo ""

# Delete existing tenant with same slug (if any)
DEL_STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
  -X DELETE "$ADMIN/api/superadmin/tenants/$SLUG" \
  -H "X-Super-Admin-Key: $SUPER_KEY")

if [ "$DEL_STATUS" = "204" ]; then
  echo "✓ Старый тенант '$SLUG' удалён"
elif [ "$DEL_STATUS" = "401" ]; then
  echo "✗ Ошибка авторизации — проверь SUPER_ADMIN_KEY"
  exit 1
fi

# Create new tenant
RESPONSE=$(curl -sf \
  -X POST "$ADMIN/api/superadmin/tenants" \
  -H "Content-Type: application/json" \
  -H "X-Super-Admin-Key: $SUPER_KEY" \
  -d "{
    \"slug\":            \"$SLUG\",
    \"display_name\":    \"$NAME\",
    \"owner_email\":     \"owner@$SLUG.local\",
    \"signing_key_enc\": \"$(openssl rand -hex 32)\",
    \"cert_pin\":        \"$(openssl rand -hex 16)\"
  }")

echo "$RESPONSE" | python3 -m json.tool

TENANT_ID=$(echo "$RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])")

echo ""
echo "✓ Тенант создан: $TENANT_ID"
echo ""
echo "Следующие шаги:"
echo "  1. Установи NEXT_PUBLIC_TENANT_ID перед запуском сайта:"
echo "     export NEXT_PUBLIC_TENANT_ID=$TENANT_ID"
echo ""
echo "  2. Зарегистрируйся на сайте (localhost:3000/auth/register)"
echo "  3. Выдай себе роль admin:"
echo ""
echo "  docker compose -f deploy/docker-compose.codespaces.yml exec postgres \\"
echo "    psql -U kmguard -d kmguard \\"
echo "    -c \"UPDATE tenant_${SLUG}.users SET role = 'admin' WHERE email = 'your@email.com';\""
