#!/usr/bin/env bash
set -euo pipefail

echo "── KMGuard Codespace setup ──────────────────────────────────"

# ── 1. Копируем .env для локальной разработки ─────────────────────
if [ ! -f deploy/.env ]; then
  cp deploy/.env.codespaces deploy/.env
  echo "✓ .env создан из .env.codespaces"
fi

# Symlink so godotenv finds the file from any working directory
ln -sf deploy/.env .env 2>/dev/null || true
ln -sf ../deploy/.env backend/.env 2>/dev/null || true

# ── 2. Поднимаем инфраструктуру (Postgres, Redis, MinIO) ──────────
docker compose -f deploy/docker-compose.codespaces.yml up -d
echo "✓ Инфраструктура поднята"

# ── 3. Ждём Postgres ──────────────────────────────────────────────
echo "Ждём Postgres..."
until docker compose -f deploy/docker-compose.codespaces.yml \
  exec -T postgres pg_isready -U kmguard -d kmguard > /dev/null 2>&1; do
  sleep 1
done
echo "✓ Postgres готов"

# ── 4. Создаём bucket в MinIO ─────────────────────────────────────
sleep 3
docker run --rm --network kmguard-dev \
  minio/mc:latest \
  alias set local http://minio:9000 kmguardadmin kmguardminio123 > /dev/null 2>&1 || true
docker run --rm --network kmguard-dev \
  minio/mc:latest \
  mb local/kmguard > /dev/null 2>&1 || true
echo "✓ MinIO bucket создан"

echo ""
echo "────────────────────────────────────────────────────────────"
echo "  Следующие шаги:"
echo ""
echo "  1. Запусти backend:"
echo "     cd backend && go run ./cmd/public"
echo ""
echo "  2. Запусти сайт:"
echo "     cd kmguard-site && npm install && npm run dev"
echo ""
echo "  3. Создай тенанта:"
echo "     bash deploy/scripts/create-tenant-local.sh supreme \"Supreme Client\""
echo "────────────────────────────────────────────────────────────"