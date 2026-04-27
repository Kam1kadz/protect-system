#!/usr/bin/env bash
# Usage: ./create-tenant.sh <slug> "Display Name"
# Example: ./create-tenant.sh arbuz "Arbuz Client"

set -euo pipefail

SLUG="${1:?Usage: $0 <slug> <display_name>}"
NAME="${2:?Usage: $0 <slug> <display_name>}"
API_URL="${SUPERADMIN_API_URL:-http://localhost:8081}"
API_KEY="${SUPER_ADMIN_KEY:?SUPER_ADMIN_KEY env var required}"

echo "Creating tenant: $SLUG ($NAME)"

RESPONSE=$(curl -sf \
  -X POST "$API_URL/api/superadmin/tenants" \
  -H "Content-Type: application/json" \
  -H "X-Super-Admin-Key: $API_KEY" \
  -d "{\"slug\":\"$SLUG\",\"display_name\":\"$NAME\"}")

echo "Created: $RESPONSE"
echo ""
echo "Next steps:"
echo "  1. Configure TenantConfig.cs in the loader with tenant ID from above"
echo "  2. Create admin user via /api/v1/auth/register"
echo "  3. Manually set role to 'admin' in DB:"
echo "     UPDATE ${SLUG}.users SET role = 'admin' WHERE email = 'your@email.com';"
echo "  4. Copy nginx config and set up SSL:"
echo "     cp deploy/nginx/sites/tenant.conf.template deploy/nginx/sites/${SLUG}.conf"
echo "     sed -i 's/DOMAIN/yourdomain.com/g' deploy/nginx/sites/${SLUG}.conf"