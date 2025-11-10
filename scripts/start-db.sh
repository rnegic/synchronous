#!/bin/bash

set -e

echo "🚀 Запуск PostgreSQL в Docker контейнере..."

# Переход в директорию проекта
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_DIR"

# Проверка .env файла
if [ ! -f .env ]; then
    echo "❌ Файл .env не найден!"
    echo "Создайте .env из .env.example:"
    echo "  cp .env.example .env"
    echo "  nano .env"
    exit 1
fi

# Запуск только PostgreSQL
docker compose up -d postgres

echo "✅ PostgreSQL запущен!"
echo ""
echo "Проверка статуса:"
docker compose ps postgres
echo ""
echo "Логи:"
docker compose logs postgres | tail -20
echo ""
echo "Подключение к БД:"
echo "docker compose exec postgres psql -U \${DB_USER:-synchronous_user} -d \${DB_NAME:-synchronous_db}"

