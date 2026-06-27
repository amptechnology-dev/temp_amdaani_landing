#!/bin/bash
set -e

DOMAIN="amdaani.com"
EMAIL="devs.amptechnology@gmail.com"
APP_CONTAINER="landing-app"
APP_PORT="7010"

# Reuse nginx + certbot from the backend project
BACKEND_PROJECT_DIR="/root/amp_portal_backend"
NGINX_CONF_DIR="$BACKEND_PROJECT_DIR/nginx/conf.d"
CERTBOT_WWW_DIR="$BACKEND_PROJECT_DIR/certbot/www"
CERTBOT_CONF_DIR="$BACKEND_PROJECT_DIR/certbot/conf"

CONF_FILE="$NGINX_CONF_DIR/$DOMAIN.conf"
CERT_PATH="$CERTBOT_CONF_DIR/live/$DOMAIN/fullchain.pem"

echo "=== Starting SSL setup for $DOMAIN (using existing nginx) ==="

# Make sure the backend nginx is running
if ! docker ps --format '{{.Names}}' | grep -q '^nginx$'; then
  echo "ERROR: nginx container is not running."
  echo "Start the backend project first: cd $BACKEND_PROJECT_DIR && ./init-ssl.sh"
  exit 1
fi

mkdir -p "$NGINX_CONF_DIR"
mkdir -p "$CERTBOT_WWW_DIR/.well-known/acme-challenge"
mkdir -p "$CERTBOT_CONF_DIR"

write_https_config() {
cat > "$CONF_FILE" << NGINXEOF
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
        proxy_pass http://$APP_CONTAINER:$APP_PORT;
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
# CASE 1: Certificate already exists → just redeploy
# ─────────────────────────────────────────────────────────────
if test -f "$CERT_PATH"; then
  echo "Certificate already exists — writing HTTPS config."
  write_https_config

  echo "Building and starting frontend container..."
  docker compose up -d --build --remove-orphans

  echo "Reloading nginx..."
  docker exec nginx nginx -s reload

  echo ""
  echo "=== Redeploy complete! ==="
  echo "=== https://$DOMAIN is live ==="
  exit 0
fi

# ─────────────────────────────────────────────────────────────
# CASE 2: First time — generate SSL certificate
# ─────────────────────────────────────────────────────────────
echo "No certificate found — starting first-time SSL setup..."

# Write temporary HTTP-only config
cat > "$CONF_FILE" << NGINXEOF
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

echo "Temporary HTTP config written."

# Reload existing nginx to pick up new domain config
docker exec nginx nginx -s reload
sleep 3

echo "Verifying $DOMAIN responds on port 80..."
curl -sf -H "Host: $DOMAIN" http://localhost:80 > /dev/null \
  && echo "Domain responding OK" \
  || { echo "ERROR: $DOMAIN not responding — check DNS points to this VPS"; docker logs nginx --tail 30; exit 1; }

# Request certificate
echo "Requesting certificate from Let's Encrypt..."
docker run --rm \
  -v "$CERTBOT_WWW_DIR:/var/www/certbot" \
  -v "$CERTBOT_CONF_DIR:/etc/letsencrypt" \
  certbot/certbot certonly \
  --webroot \
  --webroot-path=/var/www/certbot \
  --email "$EMAIL" \
  --agree-tos \
  --no-eff-email \
  -d "$DOMAIN"

if ! test -f "$CERT_PATH"; then
  echo "ERROR: Certificate not found at $CERT_PATH after certbot run!"
  ls -la "$CERTBOT_CONF_DIR/live/" 2>/dev/null || echo "live/ folder does not exist"
  exit 1
fi

echo "Certificate obtained successfully!"

# Write real HTTPS config
write_https_config
echo "HTTPS config written."

# Start frontend container
echo "Starting frontend container..."
docker compose up -d --build --remove-orphans

# Reload nginx with HTTPS config
echo "Reloading nginx with HTTPS config..."
docker exec nginx nginx -s reload

echo ""
echo "=== SSL setup complete! ==="
echo "=== https://$DOMAIN is now live! ==="