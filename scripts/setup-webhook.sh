#!/bin/bash

# Скрипт для настройки webhook через Max API
# Использование: ./setup-webhook.sh [YOUR_ACCESS_TOKEN]

set -e

# Если токен не передан, пытаемся извлечь из config.toml
if [ -z "$1" ] && [ -z "$MAXAPI_ACCESS_TOKEN" ]; then
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    CONFIG_FILE="/opt/synchronous/backend/configs/config.toml"
    
    if [ -f "$CONFIG_FILE" ]; then
        echo "🔍 Автоматическое извлечение токена из config.toml..."
        # Ищем ACCESS_TOKEN в секции [MAXAPI] или в корне
        # Формат TOML: ACCESS_TOKEN="..." или ACCESS_TOKEN='...'
        ACCESS_TOKEN=$(awk '/\[MAXAPI\]/,/^\[/ {if (/^[[:space:]]*ACCESS_TOKEN[[:space:]]*=[[:space:]]*"/) {match($0, /"([^"]+)"/, arr); print arr[1]; exit}}' "$CONFIG_FILE" 2>/dev/null)
        if [ -z "$ACCESS_TOKEN" ]; then
            # Пробуем найти в любой секции или в корне
            ACCESS_TOKEN=$(grep -E "^\s*ACCESS_TOKEN\s*=\s*\"" "$CONFIG_FILE" | head -1 | sed -E 's/.*ACCESS_TOKEN\s*=\s*"([^"]+)".*/\1/')
        fi
        if [ -z "$ACCESS_TOKEN" ]; then
            # Пробуем без кавычек
            ACCESS_TOKEN=$(grep -E "^\s*ACCESS_TOKEN\s*=" "$CONFIG_FILE" | head -1 | sed -E 's/.*ACCESS_TOKEN\s*=\s*([^[:space:]]+).*/\1/')
        fi
        if [ -n "$ACCESS_TOKEN" ]; then
            echo "✅ Токен найден (длина: ${#ACCESS_TOKEN} символов)"
        else
            echo "⚠️  Токен не найден в config.toml"
        fi
    fi
fi

ACCESS_TOKEN="${1:-${ACCESS_TOKEN:-${MAXAPI_ACCESS_TOKEN}}}"
WEBHOOK_URL="${WEBHOOK_URL:-https://focus-sync.ru/api/v1/webhook/max}"

if [ -z "$ACCESS_TOKEN" ]; then
    echo "❌ Ошибка: ACCESS_TOKEN не указан"
    echo ""
    echo "Использование:"
    echo "  $0 YOUR_ACCESS_TOKEN"
    echo "  или"
    echo "  export MAXAPI_ACCESS_TOKEN=your_token"
    echo "  $0"
    echo ""
    echo "💡 Токен можно найти в:"
    echo "  - /opt/synchronous/backend/configs/config.toml (строка ACCESS_TOKEN=...)"
    echo "  - или в настройках бота на платформе MAX"
    echo ""
    echo "   Для автоматического извлечения из config.toml:"
    echo "   ACCESS_TOKEN=\$(grep ACCESS_TOKEN /opt/synchronous/backend/configs/config.toml | cut -d'\"' -f2)"
    echo "   $0 \"\$ACCESS_TOKEN\""
    exit 1
fi

# Проверяем формат токена (должен быть не пустым)
if [ ${#ACCESS_TOKEN} -lt 10 ]; then
    echo "⚠️  Предупреждение: токен слишком короткий, возможно неверный"
fi

echo "🔧 Настройка webhook для Max API..."
echo "URL: $WEBHOOK_URL"
echo "Токен: ${ACCESS_TOKEN:0:20}..." # Показываем первые 20 символов для проверки
echo ""

# Проверяем существующие подписки
echo "📋 Проверка существующих подписки..."
EXISTING=$(curl -s -w "\n%{http_code}" -X GET "https://platform-api.max.ru/subscriptions" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json")

HTTP_CODE=$(echo "$EXISTING" | tail -n 1)
BODY=$(echo "$EXISTING" | head -n -1)

if [ "$HTTP_CODE" != "200" ]; then
    echo "❌ Ошибка при проверке подписок (HTTP $HTTP_CODE):"
    echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
    if echo "$BODY" | grep -q "Invalid access_token\|invalid_token\|unauthorized"; then
        echo ""
        echo "❌ Токен недействителен или не имеет прав доступа"
        echo ""
        echo "💡 Возможные причины:"
        echo "   1. Токен устарел или был отозван"
        echo "   2. Токен не имеет прав на управление подписками"
        echo "   3. Используется неправильный тип токена"
        echo ""
        echo "🔧 Решения:"
        echo "   1. Получите новый токен в настройках бота на платформе MAX"
        echo "   2. Убедитесь, что используете токен из раздела MAXAPI.ACCESS_TOKEN"
        echo "   3. Проверьте, что токен имеет права на subscriptions API"
        echo ""
        echo "📝 Текущий токен (первые 20 символов): ${ACCESS_TOKEN:0:20}..."
        echo ""
        echo "💡 Попробуйте:"
        echo "   - Проверить токен в настройках бота на платформе MAX"
        echo "   - Получить новый токен, если старый не работает"
        echo "   - Убедиться, что токен имеет права на subscriptions API"
        exit 1
    fi
else
    echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
fi

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
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "https://platform-api.max.ru/subscriptions" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"url\": \"$WEBHOOK_URL\"
  }")

HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
BODY=$(echo "$RESPONSE" | head -n -1)

echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"

# Проверяем результат
if [ "$HTTP_CODE" != "200" ] && [ "$HTTP_CODE" != "201" ]; then
    echo ""
    echo "❌ Ошибка при создании подписки (HTTP $HTTP_CODE)"
    if echo "$BODY" | grep -q "Invalid access_token\|invalid_token\|unauthorized"; then
        echo ""
        echo "❌ Токен недействителен или не имеет прав доступа"
        echo ""
        echo "💡 Возможные причины:"
        echo "   1. Токен устарел или был отозван"
        echo "   2. Токен не имеет прав на создание подписок"
        echo "   3. Используется неправильный тип токена"
        echo ""
        echo "🔧 Решения:"
        echo "   1. Получите новый ACCESS_TOKEN в настройках бота на платформе MAX"
        echo "   2. Убедитесь, что используете токен из раздела MAXAPI.ACCESS_TOKEN"
        echo "   3. Проверьте, что токен имеет права на subscriptions API"
        echo ""
        echo "📝 Текущий токен (первые 20 символов): ${ACCESS_TOKEN:0:20}..."
        echo ""
        echo "💡 Инструкция по получению токена:"
        echo "   1. Войдите в консоль разработчика MAX"
        echo "   2. Перейдите в настройки вашего бота"
        echo "   3. Найдите раздел 'API токены' или 'Access Tokens'"
        echo "   4. Скопируйте ACCESS_TOKEN (не BOT_TOKEN!)"
        echo "   5. Обновите config.toml или передайте токен напрямую:"
        echo "      $0 \"YOUR_NEW_ACCESS_TOKEN\""
    fi
    exit 1
else
    echo ""
    echo "✅ Webhook успешно настроен!"
    echo ""
    echo "📝 Проверка webhook:"
    echo "curl -X POST $WEBHOOK_URL -H 'Content-Type: application/json' -d '{\"update_type\":\"test\"}'"
fi

