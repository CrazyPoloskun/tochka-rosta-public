#!/bin/bash
# ==============================================================================
# Скрипт автоматического выпуска официального доверенного SSL от Let's Encrypt
# Использование:
#   bash scripts/setup-ssl.sh
# или для своего домена:
#   bash scripts/setup-ssl.sh yourdomain.ru admin@yourdomain.ru
# ==============================================================================

set -e

DOMAIN=${1:-83-141-68-181.sslip.io}
EMAIL=${2:-admin@83-141-68-181.sslip.io}

echo "================================================================="
echo " Запуск выпуска доверенного сертификата Let's Encrypt"
echo " Домен: $DOMAIN"
echo " Email: $EMAIL"
echo "================================================================="

# Detect docker compose syntax
if docker compose version >/dev/null 2>&1; then
    DOCKER_COMPOSE="docker compose"
else
    DOCKER_COMPOSE="docker-compose"
fi

echo "==> 1. Остановка Nginx для гарантированного освобождения порта 80..."
$DOCKER_COMPOSE stop nginx || true

echo "==> 2. Запрос официального SSL-сертификата Let's Encrypt (Standalone)..."
$DOCKER_COMPOSE run --rm -p 80:80 --entrypoint certbot certbot certonly \
    --standalone \
    --email "$EMAIL" \
    --agree-tos \
    --no-eff-email \
    --non-interactive \
    -d "$DOMAIN"

echo "==> 3. Активация конфигурации HTTPS в Nginx..."
sed "s/DOMAIN_NAME_PLACEHOLDER/$DOMAIN/g" nginx/ssl.conf.template > nginx/conf.d/default.conf

echo "==> 4. Запуск всех сервисов с новым доверенным сертификатом..."
$DOCKER_COMPOSE up -d

echo ""
echo "================================================================="
echo " Готово! Официальный доверенный SSL-сертификат Let's Encrypt активен!"
echo ""
echo " Откройте в браузере:"
echo " https://$DOMAIN"
echo ""
echo " Сертификат полностью доверенный, без предупреждений (зеленый замок)."
echo " Автоматическое продление работает каждые 12 часов через контейнер certbot."
echo "================================================================="
