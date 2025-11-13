.PHONY: run migrate-up migrate-down migrate-status migrate-create migrate-reset migrate-fix migrate-version install-goose check-goose help

# Запуск приложения
run:
	go run cmd/app/main.go

# ============================================================================
# Миграции базы данных с goose
# ============================================================================
# Использование:
#   DB_DSN="postgres://user:password@localhost:5432/database?sslmode=disable" make migrate-up
#   или установите переменную окружения: export DB_DSN="..."
# ============================================================================

# DSN по умолчанию (можно переопределить через переменную окружения)
DB_DSN ?= postgres://user:password@localhost:5432/database?sslmode=disable

# Директория с миграциями
MIGRATIONS_DIR = migrations

# Проверка наличия goose
check-goose:
	@which goose > /dev/null || (echo "❌ goose не установлен. Запустите: make install-goose" && exit 1)

# Установка goose
install-goose:
	@echo "📦 Установка goose..."
	@go install github.com/pressly/goose/v3/cmd/goose@latest
	@echo "✅ goose установлен"

# Применение всех миграций
migrate-up: check-goose
	@echo "🚀 Применение миграций..."
	@goose -dir $(MIGRATIONS_DIR) postgres "$(DB_DSN)" up
	@echo "✅ Миграции применены"

# Откат последней миграции
migrate-down: check-goose
	@echo "⬇️  Откат последней миграции..."
	@goose -dir $(MIGRATIONS_DIR) postgres "$(DB_DSN)" down
	@echo "✅ Миграция откачена"

# Статус миграций
migrate-status: check-goose
	@echo "📊 Статус миграций:"
	@goose -dir $(MIGRATIONS_DIR) postgres "$(DB_DSN)" status

# Создание новой миграции
migrate-create: check-goose
	@read -p "Введите название миграции: " name; \
	goose -dir $(MIGRATIONS_DIR) create $$name sql && \
	echo "✅ Миграция создана: $(MIGRATIONS_DIR)/$$name"

# Полный откат всех миграций (ОПАСНО!)
migrate-reset: check-goose
	@echo "⚠️  ВНИМАНИЕ: Это удалит все данные!"
	@read -p "Вы уверены? (yes/no): " confirm; \
	if [ "$$confirm" != "yes" ]; then \
		echo "❌ Отменено"; \
		exit 1; \
	fi; \
	goose -dir $(MIGRATIONS_DIR) postgres "$(DB_DSN)" reset && \
	echo "✅ Все миграции откачены"

# Фиксация версии миграции (используется при проблемах)
migrate-fix: check-goose
	@echo "🔧 Фиксация версии миграции..."
	@goose -dir $(MIGRATIONS_DIR) postgres "$(DB_DSN)" fix

# Применение миграций до конкретной версии
migrate-version: check-goose
	@if [ -z "$(VERSION)" ]; then \
		echo "❌ Укажите версию: make migrate-version VERSION=123"; \
		exit 1; \
	fi
	@echo "🎯 Применение миграций до версии $(VERSION)..."
	@goose -dir $(MIGRATIONS_DIR) postgres "$(DB_DSN)" up-to $(VERSION)
	@echo "✅ Миграции применены до версии $(VERSION)"

# Справка
help:
	@echo "📚 Доступные команды для миграций:"
	@echo ""
	@echo "  make install-goose          - Установить goose"
	@echo "  make migrate-up              - Применить все миграции"
	@echo "  make migrate-down            - Откатить последнюю миграцию"
	@echo "  make migrate-status          - Показать статус миграций"
	@echo "  make migrate-create          - Создать новую миграцию"
	@echo "  make migrate-reset           - Откатить все миграции (ОПАСНО!)"
	@echo "  make migrate-fix             - Исправить версию миграции"
	@echo "  make migrate-version VERSION=123 - Применить до версии"
	@echo ""
	@echo "Примеры:"
	@echo "  DB_DSN=\"postgres://user:pass@localhost:5432/db?sslmode=disable\" make migrate-up"
	@echo "  make migrate-version VERSION=5"
	@echo ""