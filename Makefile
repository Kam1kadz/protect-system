.PHONY: dev prod down logs tenant backup gen-secrets

# ── Dev ───────────────────────────────────────────────────────────────────────
dev:
	docker compose -f deploy/docker-compose.yml up --build

down:
	docker compose -f deploy/docker-compose.yml down

logs:
	docker compose -f deploy/docker-compose.yml logs -f --tail=100

# ── Prod ──────────────────────────────────────────────────────────────────────
prod:
	docker compose \
	  -f deploy/docker-compose.yml \
	  -f deploy/docker-compose.prod.yml \
	  up -d --build

prod-down:
	docker compose \
	  -f deploy/docker-compose.yml \
	  -f deploy/docker-compose.prod.yml \
	  down

# ── Tenant management ─────────────────────────────────────────────────────────
tenant:
	@read -p "Slug: " slug; \
	 read -p "Display name: " name; \
	 bash deploy/scripts/create-tenant.sh "$$slug" "$$name"

# ── Backup ────────────────────────────────────────────────────────────────────
backup:
	bash deploy/scripts/backup.sh

# ── Generate secrets ──────────────────────────────────────────────────────────
gen-secrets:
	@echo "JWT_ACCESS_SECRET=$$(openssl rand -hex 32)"
	@echo "JWT_REFRESH_SECRET=$$(openssl rand -hex 32)"
	@echo "MASTER_KEY=$$(openssl rand -hex 32)"
	@echo "SUPER_ADMIN_KEY=$$(openssl rand -hex 32)"
	@echo "POSTGRES_PASSWORD=$$(openssl rand -base64 24 | tr -dc 'a-zA-Z0-9' | head -c 24)"
	@echo "REDIS_PASSWORD=$$(openssl rand -base64 16 | tr -dc 'a-zA-Z0-9' | head -c 16)"

# ── SSL (certbot) ─────────────────────────────────────────────────────────────
ssl:
	@read -p "Domain: " domain; \
	 docker run --rm \
	   -v /etc/letsencrypt:/etc/letsencrypt \
	   -v /var/www/certbot:/var/www/certbot \
	   certbot/certbot certonly \
	   --webroot --webroot-path=/var/www/certbot \
	   --email admin@$$domain --agree-tos --no-eff-email \
	   -d $$domain -d www.$$domain