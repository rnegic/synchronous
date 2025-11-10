#!/bin/bash

set -e

echo "🗄️  Настройка PostgreSQL в Docker контейнере..."

# Цвета
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Проверка наличия docker-compose
if ! command -v docker &> /dev/null; then
    echo -e "${RED}Docker не установлен. Установите Docker сначала.${NC}"
    exit 1
fi

if ! command -v docker compose &> /dev/null && ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}Docker Compose не установлен. Установите Docker Compose сначала.${NC}"
    exit 1
fi

# Переход в директорию проекта
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_DIR"

echo -e "${GREEN}Текущая директория: $PROJECT_DIR${NC}"

# Проверка наличия .env файла
if [ ! -f .env ]; then
    echo -e "${YELLOW}Файл .env не найден. Создаю из примера...${NC}"
    if [ -f .env.example ]; then
        cp .env.example .env
        echo -e "${YELLOW}Отредактируйте .env файл перед продолжением!${NC}"
        echo "nano .env"
        read -p "Нажмите Enter после редактирования .env файла..."
    else
        echo -e "${RED}Файл .env.example не найден!${NC}"
        exit 1
    fi
fi

# Загрузка переменных окружения
export $(cat .env | grep -v '^#' | xargs)

# Установка значений по умолчанию
DB_USER=${DB_USER:-synchronous_user}
DB_PASSWORD=${DB_PASSWORD:-change_me}
DB_NAME=${DB_NAME:-synchronous_db}

echo -e "${GREEN}Параметры БД:${NC}"
echo "  Пользователь: $DB_USER"
echo "  База данных: $DB_NAME"
echo ""

# Запуск только PostgreSQL контейнера
echo -e "${GREEN}Запуск PostgreSQL контейнера...${NC}"
docker compose up -d postgres

# Ожидание готовности БД
echo -e "${GREEN}Ожидание готовности PostgreSQL...${NC}"
sleep 5

# Проверка статуса
for i in {1..30}; do
    if docker compose exec -T postgres pg_isready -U "$DB_USER" > /dev/null 2>&1; then
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
echo -e "${GREEN}Включение расширений PostgreSQL...${NC}"
docker compose exec -T postgres psql -U "$DB_USER" -d "$DB_NAME" << EOF
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
\q
EOF

echo ""
echo -e "${GREEN}✅ База данных настроена!${NC}"
echo ""
echo -e "${YELLOW}DSN для подключения:${NC}"
echo "postgres://${DB_USER}:${DB_PASSWORD}@localhost:5432/${DB_NAME}?sslmode=disable"
echo ""
echo -e "${YELLOW}Для применения миграций выполните:${NC}"
echo "cd $PROJECT_DIR/backend"
echo "DB_DSN=\"postgres://${DB_USER}:${DB_PASSWORD}@localhost:5432/${DB_NAME}?sslmode=disable\" make migrate-up"
echo ""
echo -e "${YELLOW}Или через Docker:${NC}"
echo "docker compose run --rm backend sh -c '...'"
echo ""
echo -e "${GREEN}Проверка подключения:${NC}"
docker compose exec postgres psql -U "$DB_USER" -d "$DB_NAME" -c "SELECT version();"

