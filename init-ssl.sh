#!/bin/bash
set -e

DOMAIN="amdaani.com"
EMAIL="devs.amptechnology@gmail.com"
APP_PORT="7010"
CERT_PATH="./certbot/conf/live/$DOMAIN/fullchain.pem"

echo "=== Starting SSL setup for $DOMAIN ==="

# Ensure required directories exist
mkdir -p ./nginx/conf.d
mkdir -p ./certbot/www/.well-known/acme-challenge
mkdir -p ./certbot/conf
chown -R root:root ./certbot
chmod -R 755 ./certbot

# Writes the final HTTPS reverse-proxy config for the Next.js app
write_https_config() {
cat > ./nginx/conf.d/app.conf << NGINXEOF
server {
    listen 80;
    server_name $DOMAIN;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 301 https://\$host\$request_uri;
    }
}

server {
    listen 443 ssl;
    server_name $DOMAIN;

    ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;

    location / {
        proxy_pass http://app:$APP_PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
NGINXEOF
}

# ─────────────────────────────────────────────────────────────
# CASE 1: Certificate already exists → just redeploy app stack
# ─────────────────────────────────────────────────────────────
if test -f "$CERT_PATH"; then
  echo "Certificate already exists — skipping SSL generation."

  # Make sure the HTTPS config is in place (e.g. fresh clone with existing certs)
  write_https_config

  echo "Redeploying updated app stack..."
  docker compose up -d --build --remove-orphans

  sleep 5
  docker compose exec nginx nginx -s reload || true

  echo ""
  echo "=== Redeploy complete! ==="
  echo "=== https://$DOMAIN is live ==="
  exit 0
fi

# ─────────────────────────────────────────────────────────────
# CASE 2: First time — generate SSL certificate
# ─────────────────────────────────────────────────────────────
echo "No certificate found — starting first-time SSL setup..."

# Write a temporary HTTP-only nginx config for ACME challenge
cat > ./nginx/conf.d/app.conf << NGINXEOF
server {
    listen 80;
    server_name $DOMAIN;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 200 'OK';
        add_header Content-Type text/plain;
    }
}
NGINXEOF

echo "Temporary HTTP nginx config written."

# Tear down any existing containers cleanly
docker compose down || true

# Start nginx only (no app yet)
docker compose up -d --no-deps nginx
echo "Waiting for nginx to be ready..."
sleep 8

# Confirm nginx started
if ! docker ps --format '{{.Names}}' | grep -q '^nginx$'; then
  echo "ERROR: nginx failed to start!"
  docker logs nginx
  exit 1
fi

echo "nginx is up — verifying port 80..."
curl -sf http://localhost:80 > /dev/null && echo "port 80 OK" || { echo "ERROR: port 80 not responding"; exit 1; }

# Request certificate from Let's Encrypt
echo "Requesting certificate from Let's Encrypt..."
docker run --rm \
  -v "$(pwd)/certbot/www:/var/www/certbot" \
  -v "$(pwd)/certbot/conf:/etc/letsencrypt" \
  certbot/certbot certonly \
  --webroot \
  --webroot-path=/var/www/certbot \
  --email "$EMAIL" \
  --agree-tos \
  --no-eff-email \
  -d "$DOMAIN"

# Fix ownership — certbot container runs as root
chown -R root:root ./certbot
chmod -R 755 ./certbot
sleep 2

# Verify certificate was actually created
if ! test -f "$CERT_PATH"; then
  echo "ERROR: Certificate not found at $CERT_PATH after certbot run!"
  ls -la ./certbot/conf/live/ 2>/dev/null || echo "live/ folder does not exist"
  docker logs nginx
  exit 1
fi

echo "Certificate obtained successfully!"

# Write the real HTTPS reverse-proxy config now that certs exist
write_https_config
echo "HTTPS nginx config written."

# Stop the temporary nginx so docker compose up can take over cleanly
docker compose down nginx || true

# Start the full stack
echo "Starting full application stack..."
docker compose up -d --build --remove-orphans

echo "Waiting for services to be ready..."
sleep 8

# Reload nginx with the HTTPS config now that certs exist
docker compose exec nginx nginx -s reload || true

echo ""
echo "=== SSL setup complete! ==="
echo "=== https://$DOMAIN is now live! ==="