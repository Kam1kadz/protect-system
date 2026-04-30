#!/usr/bin/env bash
set -euo pipefail

SLUG="${1:?Usage: $0 <slug> <display_name>}"
NAME="${2:?Usage: $0 <slug> <display_name>}"

echo "Создаю тенанта: $SLUG ($NAME)"

RESPONSE=$(curl -sf \
  -X POST "http://localhost:8081/api/superadmin/tenants" \
  -H "Content-Type: application/json" \
  -H "X-Super-Admin-Key: dev_super_admin_key" \
  -d "{\"slug\":\"$SLUG\",\"display_name\":\"$NAME\"}")

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