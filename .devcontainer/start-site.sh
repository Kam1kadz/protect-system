#!/usr/bin/env bash
cd "$(dirname "$0")/../kmguard-site"

# Получаем Codespace URL автоматически
if [ -n "${CODESPACE_NAME:-}" ]; then
  export NEXT_PUBLIC_API_URL="https://${CODESPACE_NAME}-8080.app.github.dev"
else
  export NEXT_PUBLIC_API_URL="http://localhost:8080"
fi

echo "▶ API URL: $NEXT_PUBLIC_API_URL"
if [ -z "${NEXT_PUBLIC_TENANT_ID:-}" ]; then
  echo "⚠ NEXT_PUBLIC_TENANT_ID не установлен. Создай тенанта и экспортируй ID:"
  echo "   bash deploy/scripts/create-tenant-local.sh arbuz \"Arbuz Client\""
fi
echo "▶ Запускаю Next.js на :3000..."

npm install --silent
npm run dev