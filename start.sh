#!/usr/bin/env bash
set -e

echo "Pulling latest changes..."
git pull

echo "Installing frontend dependencies..."
cd kmguard-site && npm install && cd ..

echo "Starting backend..."
cd backend && go run ./cmd/server &
BACKEND_PID=$!
cd ..

echo "Starting frontend..."
cd kmguard-site && npm run dev &
FRONTEND_PID=$!
cd ..

echo ""
echo "✅ Running! Backend PID=$BACKEND_PID | Frontend PID=$FRONTEND_PID"
echo "Press Ctrl+C to stop both"

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; echo 'Stopped.'" EXIT
wait
