#!/bin/bash
# ==============================================================================
# Скрипт первоначальной настройки VPS сервера (Ubuntu / Debian) для Точки Роста
# Запуск на чистом сервере:
#   curl -sSL https://raw.githubusercontent.com/<ваш-аккаунт>/<ваш-репозиторий>/main/scripts/setup-vps.sh | bash
# или после git clone:
#   bash scripts/setup-vps.sh
# ==============================================================================

set -e

echo "==> 1. Обновление пакетов сервера..."
sudo apt-get update && sudo apt-get upgrade -y

echo "==> 2. Установка необходимых утилит..."
sudo apt-get install -y ca-certificates curl gnupg lsb-release git ufw

echo "==> 3. Установка Docker и Docker Compose..."
if ! command -v docker &> /dev/null; then
    sudo install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    sudo chmod a+r /etc/apt/keyrings/docker.gpg

    echo \
      "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
      $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
      sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

    sudo apt-get update
    sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    sudo systemctl enable docker
    sudo systemctl start docker
fi

echo "==> 4. Настройка фаервола (UFW)..."
sudo ufw allow 22/tcp || true
sudo ufw allow 80/tcp || true
sudo ufw allow 443/tcp || true
sudo ufw --force enable || true

echo "==> Docker готов: $(docker --version)"
echo "==> Docker Compose готов: $(docker compose version)"
echo ""
echo "=============================================================================="
echo "Сервер готов к автодеплою через GitHub Actions!"
echo "Для завершения настройки:"
echo "1. Склонируйте репозиторий в /opt/tochka-rosta:"
echo "   sudo git clone <URL_ВАШЕГО_РЕПОЗИТОРИЯ> /opt/tochka-rosta"
echo "   cd /opt/tochka-rosta"
echo "   cp .env.production.example .env"
echo "2. Добавьте секреты в GitHub Settings -> Secrets -> Actions:"
echo "   SSH_HOST, SSH_USER, SSH_KEY, PROJECT_PATH"
echo "=============================================================================="
