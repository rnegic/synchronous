Synchronous
=========

Платформа для проведения фокус‑сессий с веб‑клиентом (React/Vite) и бэкендом на Go. Репозиторий уже содержит Docker‑окружение для локальных запусков и деплоя.

## Архитектура

- `backend/` — REST API на Go (Gin + GORM, Postgres 16).
- `frontend/` — SPA на React 19 + Vite + Ant Design.
- `nginx/` — конфигурация реверс‑прокси для продакшен окружения.
- `docker-compose.yml` — локальный стенд: Postgres, backend, frontend, swagger-ui и nginx.

## Требования

- Docker Engine >= 24 и Docker Compose plugin.
- Go 1.24 (для локальных запусков бэкенда без контейнера).
- Node.js 20 + npm 10 (для разработки фронтенда без контейнера).
- GNU Make (опционально, упрощает запуск задач из `backend/Makefile`).

## Быстрый старт (Docker Compose)

1. Скопируйте переменные окружения (пример ниже) в файл `.env` в корне:
   ```env
   DB_USER=synchronous_user
   DB_PASSWORD=change_me
   DB_NAME=synchronous_db
   MAXAPI_BASE_URL=https://platform-api.max.ru
   MAXAPI_ACCESS_TOKEN=<your_max_token>
   JWT_SECRET=<your_jwt_secret>
   ```

2. Соберите и поднимите сервисы:
   ```bash
   docker compose build
   docker compose up -d
   ```

3. Проверьте статус:
   ```bash
   docker compose ps
   ```

4. Откройте:
   - API: `http://localhost:8080/api/v1/health`
   - Frontend: `http://localhost:3000`
   - Swagger UI: `http://localhost:8081`

Остановить окружение: `docker compose down`.

## Запуск компонентов отдельно

### Backend (Go)

```bash
cd backend
cp .env.example .env   # при наличии файла-примера
go mod download
go run ./cmd/app
```

Полезные make-команды:
```bash
cd backend
make run          # сборка + запуск
make test         # юнит-тесты
make lint         # статический анализ (если настроен)
```

### Frontend (Vite)

```bash
cd frontend
npm ci
npm run dev       # локальная разработка на http://localhost:5173
npm run build     # production-сборка
npm run preview   # предпросмотр собранного бандла
```

### Postgres

Если база нужна без Docker Compose:
```bash
docker run --name synchronous-postgres \
  -e POSTGRES_USER=synchronous_user \
  -e POSTGRES_PASSWORD=change_me \
  -e POSTGRES_DB=synchronous_db \
  -p 5432:5432 -d postgres:16-alpine
```

## Проверка работоспособности

```bash
# Health бэкенда
curl -f http://localhost:8080/api/v1/health

# Получить активную сессию (нужна авторизация)
curl -H "Authorization: Bearer <TOKEN>" \
     http://localhost:8080/api/v1/sessions/active
```

## Структура проекта

```
.
├── backend/        # исходники Go API
├── frontend/       # React SPA
├── nginx/          # конфигурация прод nginx
├── docker-compose.yml
├── Requierments.txt
└── README.md
```

## Полезные ссылки

- Swagger: `http://localhost:8081`
- MAX API client: `github.com/max-messenger/max-bot-api-client-go`
- Vite документация: https://vitejs.dev/

