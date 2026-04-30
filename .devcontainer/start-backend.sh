#!/usr/bin/env bash
cd "$(dirname "$0")/../backend"

# Загрузить .env
set -a
source ../deploy/.env
set +a

echo "▶ Запускаю Public API на :8080..."
go run ./cmd/public