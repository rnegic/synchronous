#!/bin/bash

set -e

echo "🚀 Запуск всех сервисов (БД + Backend + Nginx)..."

# Цвета
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Переход в директорию проекта
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_DIR"

echo -e "${GREEN}Текущая директория: $PROJECT_DIR${NC}"

# Проверка наличия docker-composec
if ! command -v docker &> /dev/null; then
    echo -e "${RED}Docker не установлен. Установите Docker сначала.${NC}"
    exit 1
fi

if ! command -v docker compose &> /dev/null && ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}Docker Compose не установлен. Установите Docker Compose сначала.${NC}"
    exit 1
fi

# Проверка наличия .env файла
if [ ! -f .env ]; then
    echo -e "${YELLOW}Файл .env не найден. Создаю из примера...${NC}"
    if [ -f .env.example ]; then
        cp .env.example .env
        echo -e "${RED}⚠️  ВАЖНО: Отредактируйте .env файл перед продолжением!${NC}"
        echo "   nano .env"
        echo ""
        read -p "Нажмите Enter после редактирования .env файла..."
    else
        echo -e "${RED}Файл .env.example не найден!${NC}"
        exit 1
    fi
fi

# Загрузка переменных окружения
export $(cat .env | grep -v '^#' | xargs)

echo ""
echo -e "${GREEN}Шаг 1: Загрузка образов...${NC}"
# Попытка загрузки с повторными попытками (для обхода лимита Docker Hub)
echo -e "${YELLOW}Загрузка образа PostgreSQL (может занять время)...${NC}"
for i in {1..3}; do
    if ! docker compose pull postgres 2>&1 | tee /tmp/docker-pull.log | grep -q "toomanyrequests\|rate limit"; then
        if [ ${PIPESTATUS[0]} -eq 0 ]; then
            echo -e "${GREEN}Образ загружен успешно!${NC}"
            break
        fi
    fi
    
    if [ $i -lt 3 ]; then
        echo -e "${YELLOW}Попытка $i: Лимит Docker Hub. Повтор через 10 секунд...${NC}"
        sleep 10
    else
        echo -e "${RED}Не удалось загрузить образ после 3 попыток.${NC}"
        echo -e "${YELLOW}Возможные решения:${NC}"
        echo "  1. Авторизуйтесь в Docker Hub: docker login"
        echo "     Или: ./scripts/docker-login.sh"
        echo "  2. Подождите 6 часов и попробуйте снова"
        echo "  3. Используйте уже загруженный образ (если есть):"
        echo "     docker images | grep postgres"
        echo ""
        echo -e "${YELLOW}Попробовать продолжить с существующим образом? (y/n)${NC}"
        read -p "> " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
done

echo ""
echo -e "${GREEN}Шаг 2: Запуск PostgreSQL...${NC}"
docker compose up -d postgres

# Ожидание готовности БД
echo ""
echo -e "${GREEN}Шаг 3: Ожидание готовности PostgreSQL...${NC}"
for i in {1..30}; do
    if docker compose exec -T postgres pg_isready -U ${DB_USER:-synchronous_user} > /dev/null 2>&1; then
        echo -e "${GREEN}PostgreSQL готов!${NC}"
        break
    fi
    if [ $i -eq 30 ]; then
        echo -e "${RED}PostgreSQL не запустился за 30 секунд${NC}"
        docker compose logs postgres
        exit 1
    fi
    echo -n "."
    sleep 1
done

# Включение расширений
echo ""
echo -e "${GREEN}Шаг 4: Включение расширений PostgreSQL...${NC}"
docker compose exec -T postgres psql -U ${DB_USER:-synchronous_user} -d ${DB_NAME:-synchronous_db} << EOF 2>/dev/null || true
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
\q
EOF

# Применение миграций
echo ""
echo -e "${GREEN}Шаг 5: Применение миграций...${NC}"
docker compose run --rm backend sh -c "
  export DB_DSN='postgres://\${DB_USER}:\${DB_PASSWORD}@postgres:5432/\${DB_NAME}?sslmode=disable' && \
  /usr/local/go/bin/go install github.com/pressly/goose/v3/cmd/goose@latest 2>/dev/null && \
  ~/go/bin/goose -dir migrations postgres \"\$DB_DSN\" up
" || echo -e "${YELLOW}⚠️  Миграции не применены (возможно, уже применены)${NC}"

# Сборка backend (если нужно)
echo ""
echo -e "${GREEN}Шаг 6: Сборка Backend...${NC}"
docker compose build backend

# Запуск всех сервисов
echo ""
echo -e "${GREEN}Шаг 7: Запуск всех сервисов...${NC}"
docker compose up -d

# Ожидание запуска
sleep 3

# Проверка статуса
echo ""
echo -e "${GREEN}Шаг 8: Проверка статуса...${NC}"
docker compose ps

# Health check
echo ""
echo -e "${GREEN}Шаг 9: Health check...${NC}"
sleep 2
if curl -f -s http://localhost:8080/api/v1/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Backend отвечает!${NC}"
    curl -s http://localhost:8080/api/v1/health | jq . || curl -s http://localhost:8080/api/v1/health
else
    echo -e "${YELLOW}⚠️  Health check не прошел, проверьте логи:${NC}"
    echo "   docker compose logs backend"
fi

echo ""
echo -e "${GREEN}✅ Все сервисы запущены!${NC}"
echo ""
echo -e "${YELLOW}Полезные команды:${NC}"
echo "  Статус:        docker compose ps"
echo "  Логи:          docker compose logs -f"
echo "  Остановка:     docker compose stop"
echo "  Перезапуск:    docker compose restart"
echo "  Health check:  curl http://localhost:8080/api/v1/health"
echo ""

