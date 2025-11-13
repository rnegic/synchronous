.PHONY: run migrate-up migrate-down migrate-status migrate-create migrate-reset migrate-fix migrate-version install-goose check-goose migrate-up-docker migrate-status-docker migrate-down-docker migrate-script-docker migrate-up-docker-explicit help

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

# ============================================================================
# Миграции в Docker контейнере
# ============================================================================

# Применение миграций в контейнере (использует DB_DSN из переменных окружения контейнера)
migrate-up-docker:
	@echo "🐳 Применение миграций в Docker контейнере..."
	@cd .. && docker compose run --rm backend sh -c 'goose -dir migrations postgres "$$DB_DSN" up'
	@echo "✅ Миграции применены"

# Статус миграций в контейнере
migrate-status-docker:
	@echo "🐳 Статус миграций в Docker контейнере:"
	@cd .. && docker compose run --rm backend sh -c 'goose -dir migrations postgres "$$DB_DSN" status'

# Откат последней миграции в контейнере
migrate-down-docker:
	@echo "🐳 Откат последней миграции в Docker контейнере..."
	@cd .. && docker compose run --rm backend sh -c 'goose -dir migrations postgres "$$DB_DSN" down'
	@echo "✅ Миграция откачена"

# Использование скрипта migrate.sh в контейнере
migrate-script-docker:
	@echo "🐳 Запуск миграций через скрипт в контейнере..."
	@cd .. && (docker compose exec backend sh /root/scripts/migrate.sh 2>/dev/null || \
		docker compose run --rm backend sh /root/scripts/migrate.sh)

# Применение миграций с явной передачей DSN (если DB_DSN не установлена в контейнере)
migrate-up-docker-explicit:
	@echo "🐳 Применение миграций в Docker контейнере (с явным DSN)..."
	@if [ -z "$(DB_DSN)" ]; then \
		echo "❌ Укажите DB_DSN: make migrate-up-docker-explicit DB_DSN=\"postgres://...\""; \
		exit 1; \
	fi
	@cd .. && docker compose run --rm -e DB_DSN="$(DB_DSN)" backend sh -c 'goose -dir migrations postgres "$$DB_DSN" up'
	@echo "✅ Миграции применены"

# Справка
help:
	@echo "📚 Доступные команды для миграций:"
	@echo ""
	@echo "Локальные команды (требуют установленный goose):"
	@echo "  make install-goose          - Установить goose"
	@echo "  make migrate-up              - Применить все миграции"
	@echo "  make migrate-down            - Откатить последнюю миграцию"
	@echo "  make migrate-status          - Показать статус миграций"
	@echo "  make migrate-create          - Создать новую миграцию"
	@echo "  make migrate-reset           - Откатить все миграции (ОПАСНО!)"
	@echo "  make migrate-fix             - Исправить версию миграции"
	@echo "  make migrate-version VERSION=123 - Применить до версии"
	@echo ""
	@echo "Docker команды (работают в контейнере):"
	@echo "  make migrate-up-docker        - Применить миграции в контейнере (использует DB_DSN из контейнера)"
	@echo "  make migrate-status-docker    - Статус миграций в контейнере"
	@echo "  make migrate-down-docker      - Откатить миграцию в контейнере"
	@echo "  make migrate-script-docker    - Запустить через migrate.sh"
	@echo "  make migrate-up-docker-explicit DB_DSN=\"...\" - Применить с явным DSN"
	@echo ""
	@echo "Примеры:"
	@echo "  DB_DSN=\"postgres://user:pass@localhost:5432/db?sslmode=disable\" make migrate-up"
	@echo "  make migrate-up-docker"
	@echo "  make migrate-version VERSION=5"
	@echo ""