#!/bin/bash

# Скрипт для настройки webhook через Max API
# Использование: ./setup-webhook.sh YOUR_ACCESS_TOKEN

set -e

ACCESS_TOKEN="${1:-${MAXAPI_ACCESS_TOKEN}}"
WEBHOOK_URL="${WEBHOOK_URL:-https://focus-sync.ru/api/v1/webhook/max}"

if [ -z "$ACCESS_TOKEN" ]; then
    echo "❌ Ошибка: ACCESS_TOKEN не указан"
    echo "Использование: $0 YOUR_ACCESS_TOKEN"
    echo "Или установите переменную окружения: export MAXAPI_ACCESS_TOKEN=your_token"
    exit 1
fi

echo "🔧 Настройка webhook для Max API..."
echo "URL: $WEBHOOK_URL"
echo ""

# Проверяем существующие подписки
echo "📋 Проверка существующих подписки..."
EXISTING=$(curl -s -X GET "https://platform-api.max.ru/subscriptions" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json")

echo "$EXISTING" | jq '.' 2>/dev/null || echo "$EXISTING"

# Удаляем старые подписки (опционально)
if [ "$2" == "--clean" ]; then
    echo ""
    echo "🗑️  Удаление старых подписок..."
    SUBSCRIPTION_IDS=$(echo "$EXISTING" | jq -r '.[].id' 2>/dev/null || echo "")
    if [ -n "$SUBSCRIPTION_IDS" ]; then
        for id in $SUBSCRIPTION_IDS; do
            echo "Удаление подписки $id..."
            curl -s -X DELETE "https://platform-api.max.ru/subscriptions/$id" \
              -H "Authorization: Bearer $ACCESS_TOKEN"
        done
    fi
fi

# Создаем новую подписку
echo ""
echo "✅ Создание новой подписки..."
RESPONSE=$(curl -s -X POST "https://platform-api.max.ru/subscriptions" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"url\": \"$WEBHOOK_URL\"
  }")

echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"

# Проверяем результат
if echo "$RESPONSE" | grep -q "error\|Error"; then
    echo ""
    echo "❌ Ошибка при создании подписки"
    exit 1
else
    echo ""
    echo "✅ Webhook успешно настроен!"
    echo ""
    echo "📝 Проверка webhook:"
    echo "curl -X POST $WEBHOOK_URL -H 'Content-Type: application/json' -d '{\"update_type\":\"test\"}'"
fi

