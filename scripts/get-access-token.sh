#!/bin/bash

# Скрипт для извлечения ACCESS_TOKEN из config.toml

CONFIG_FILE="${1:-/opt/synchronous/backend/configs/config.toml}"

if [ ! -f "$CONFIG_FILE" ]; then
    echo "❌ Файл конфигурации не найден: $CONFIG_FILE"
    exit 1
fi

# Извлекаем ACCESS_TOKEN из config.toml
# Ищем в секции [MAXAPI] или в корне
ACCESS_TOKEN=$(grep -E "^\s*ACCESS_TOKEN\s*=" "$CONFIG_FILE" | head -1 | sed -E 's/.*ACCESS_TOKEN\s*=\s*"([^"]+)".*/\1/')
if [ -z "$ACCESS_TOKEN" ]; then
    # Пробуем без кавычек
    ACCESS_TOKEN=$(grep -E "^\s*ACCESS_TOKEN\s*=" "$CONFIG_FILE" | head -1 | sed -E 's/.*ACCESS_TOKEN\s*=\s*([^[:space:]]+).*/\1/')
fi

if [ -z "$ACCESS_TOKEN" ]; then
    echo "❌ ACCESS_TOKEN не найден в $CONFIG_FILE"
    echo ""
    echo "Проверьте, что в файле есть строка:"
    echo '  ACCESS_TOKEN="your_token_here"'
    exit 1
fi

echo "$ACCESS_TOKEN"

