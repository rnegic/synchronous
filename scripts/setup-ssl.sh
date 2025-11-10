#!/bin/bash

set -e

echo "🔐 Настройка SSL сертификата..."

# Цвета
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Проверка наличия certbot
if ! command -v certbot &> /dev/null; then
    echo -e "${YELLOW}Certbot не установлен. Установка...${NC}"
    apt-get update
    apt-get install -y certbot python3-certbot-nginx
fi

# Запрос домена
read -p "Введите ваш домен (например: api.example.com): " DOMAIN

if [ -z "$DOMAIN" ]; then
    echo -e "${RED}Домен не указан. Выход.${NC}"
    exit 1
fi

echo -e "${GREEN}Настройка SSL для домена: $DOMAIN${NC}"

# Обновление конфигурации Nginx для домена
cat > /opt/synchronous/nginx/conf.d/synchronous.conf << EOF
server {
    listen 80;
    server_name $DOMAIN;

    # Временный редирект на HTTPS (после получения сертификата)
    # location / {
    #     return 301 https://\$server_name\$request_uri;
    # }

    # Для получения сертификата - проксируем на backend
    location / {
        proxy_pass http://backend:8080;
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
EOF

# Перезапуск Nginx
docker compose -f /opt/synchronous/docker-compose.yml restart nginx

# Получение сертификата
echo -e "${GREEN}Получение SSL сертификата...${NC}"
certbot --nginx -d $DOMAIN --non-interactive --agree-tos --email admin@$DOMAIN --redirect

echo -e "${GREEN}✅ SSL настроен!${NC}"
echo ""
echo "Теперь ваш сайт доступен по https://$DOMAIN"

