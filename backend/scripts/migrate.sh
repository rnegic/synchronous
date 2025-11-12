#!/bin/sh
# Скрипт для запуска миграций через goose

set -e

# Получаем DSN из переменной окружения или используем дефолтный
DB_DSN="${DB_DSN:-postgres://synchronous_user:change_me@postgres:5432/synchronous_db?sslmode=disable}"

# Проверяем наличие goose
if ! command -v goose >/dev/null 2>&1; then
    echo "❌ goose не найден. Убедитесь, что он установлен."
    exit 1
fi

# Проверяем наличие директории migrations
if [ ! -d "./migrations" ]; then
    echo "❌ Директория migrations не найдена."
    exit 1
fi

echo "🔍 Проверка статуса миграций..."
goose -dir migrations postgres "$DB_DSN" status

echo ""
echo "🚀 Применение миграций..."
goose -dir migrations postgres "$DB_DSN" up

echo ""
echo "✅ Миграции применены успешно!"

