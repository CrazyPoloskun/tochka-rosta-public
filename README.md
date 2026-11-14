# Tochka Rosta

Проект с раздельной архитектурой фронтенда и бэкенда:
- **Frontend**: [Next.js](https://nextjs.org/) (App Router, TypeScript) + [Tailwind CSS](https://tailwindcss.com/) + [Shadcn/ui](https://ui.shadcn.com/)
- **Backend**: [FastAPI](https://fastapi.tiangolo.com/) + [SQLAlchemy](https://www.sqlalchemy.org/) (Async) + [asyncpg](https://github.com/MagicStack/asyncpg) + [Alembic](https://alembic.sqlalchemy.org/)
- **Database**: [PostgreSQL](https://www.postgresql.org/)

---

## Структура проекта

```text
TochkaRosta/
├── backend/                  # Серверная часть (FastAPI + PostgreSQL)
│   ├── alembic/              # Миграции базы данных (Async Alembic)
│   ├── app/
│   │   ├── api/
│   │   │   └── v1/
│   │   │       ├── endpoints/
│   │   │       │   └── health.py # Проверка здоровья API и БД
│   │   │       └── api.py    # Сборный роутер v1
│   │   ├── core/
│   │   │   ├── config.py     # Pydantic Settings конфигурация
│   │   │   └── database.py   # Async Engine, AsyncSession, get_db
│   │   ├── models/           # SQLAlchemy модели
│   │   ├── schemas/          # Pydantic схемы валидации
│   │   └── main.py           # Точка входа FastAPI с CORS и роутами
│   ├── venv/                 # Виртуальное окружение Python
│   ├── .env                  # Локальные переменные окружения
│   ├── .env.example          # Пример переменных окружения
│   ├── alembic.ini           # Конфигурация Alembic
│   └── requirements.txt      # Python зависимости
│
├── frontend/                 # Клиентская часть (Next.js + Shadcn/ui)
│   ├── src/
│   │   ├── app/              # Next.js App Router (страницы и layouts)
│   │   ├── components/
│   │   │   └── ui/           # Shadcn/ui компоненты (Button, Card, Badge)
│   │   └── lib/              # Вспомогательные утилиты (cn и др.)
│   ├── components.json       # Конфигурация Shadcn/ui
│   └── package.json          # Node.js зависимости и скрипты
│
├── docker-compose.yml        # Контейнер PostgreSQL для локальной разработки
├── .gitignore                # Игнорируемые файлы для Python и Node.js
└── README.md
```

---

## Запуск проекта одной командой

В корневой папке проекта выполните:

```bash
npm run dev
```
*(или просто `npm start`)*

На Windows также можно запустить через двойной клик по **`start.bat`** или команду `.\start.bat`.

Команда параллельно запускает:
- **Backend API**: [http://localhost:8000](http://localhost:8000) (Swagger: `/docs`)
- **Frontend App**: [http://localhost:3000](http://localhost:3000)

Логи обоих сервисов выводятся в единую консоль с цветовым разделением префиксов `[backend]` и `[frontend]`, а нажатие `Ctrl+C` корректно останавливает оба процесса.

---

## Раздельный запуск (ручной режим)

### 1. База данных (PostgreSQL)

Если установлен Docker, запустите базу одной командой:
```bash
docker compose up -d
```
Или используйте локально установленный PostgreSQL с параметрами из `backend/.env`.

---

### 2. Запуск Backend (FastAPI)

Перейдите в каталог `backend`:
```bash
cd backend
```

Активируйте виртуальное окружение:
- **Windows (PowerShell)**:
  ```powershell
  .\venv\Scripts\Activate.ps1
  ```
- **Linux/macOS**:
  ```bash
  source venv/bin/activate
  ```

(Опционально) Установка зависимостей, если окружение создается заново:
```bash
pip install -r requirements.txt
```

Запуск сервера разработки:
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

- **API документация (Swagger UI)**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **API документация (ReDoc)**: [http://localhost:8000/redoc](http://localhost:8000/redoc)
- **Health Check**: [http://localhost:8000/api/v1/health](http://localhost:8000/api/v1/health)

#### Миграции базы данных (Alembic)
```bash
# Создание новой миграции
alembic revision --autogenerate -m "create initial tables"

# Применение миграций
alembic upgrade head
```

---

### 3. Запуск Frontend (Next.js + Tailwind + Shadcn/ui)

Перейдите в каталог `frontend`:
```bash
cd frontend
```

Запуск dev-сервера:
```bash
npm run dev
```

Приложение откроется по адресу: [http://localhost:3000](http://localhost:3000)

#### Добавление новых компонентов Shadcn/ui
```bash
cd frontend
npx shadcn@latest add <component-name>
# Например: npx shadcn@latest add dialog input dropdown-menu
```
