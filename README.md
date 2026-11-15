<div align="center">

# Точка Роста

**Цифровая платформа трансфера технологий, депонирования РИД и R&D-контрактации**

[![Next.js](https://img.shields.io/badge/Next.js-14_App_Router-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![OpenRouter](https://img.shields.io/badge/OpenRouter-AI_LLM-6366F1?style=for-the-badge)](https://openrouter.ai/)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)

</div>

---

## Возможности платформы

- **Каталог разработок и депонирование РИД**: публикация научных решений с фиксацией авторского приоритета (SHA-256), генерацией официальных PDF-свидетельств с QR-кодом и публичной верификацией в реестре (`/verify`).
- **Биржа R&D-задач и тендеров**: размещение корпоративных запросов, интерактивное управление этапами сметы (добавление, перемещение, удаление) и сбор предложений от аккредитованных лабораторий.
- **Интегрированный ИИ (OpenRouter)**:
  - Генерация ТЗ по ГОСТ 15.016-2016 с календарным планом и методиками испытаний.
  - Извлечение данных из научных PDF-статей с автоопределением отраслей и уровня TRL (1–9).
  - Интеллектуальный подбор исполнителей (AI Matchmaking).
- **Эскроу-сделки и проектное управление**: поэтапное финансирование с заморозкой средств, сдача отчетности и взаимный арбитраж.
- **Генерация отчётов по ГОСТ 7.32-2017**: автоматическое формирование итоговой научной документации в форматах PDF и DOCX со сквозной многостраничной пагинацией.
- **Верификация и досье контрагентов**: аудит ИНН/ОГРН, проверка патентов через реестры ФИПС, модерация заявок и разграничение прав (НИИ, Инвестор, Администратор).
- **Автоматическая генерация тестов (ATest)**: модуль генерации интеграционных тестов на основе контрактов с поддержкой Python, TypeScript, Go, C++ и интерактивным интерфейсом для VS Code.

---

## Архитектура проекта

```text
tochka-rosta/
├── backend/
│   ├── app/
│   │   ├── api/v1/endpoints/   # REST API (ideas, tasks, projects, certs, ai, finances)
│   │   ├── core/               # Конфигурация, безопасность, база данных
│   │   ├── models/             # SQLAlchemy модели
│   │   ├── schemas/            # Схемы валидации Pydantic
│   │   └── services/           # Сервисы (ИИ, ГОСТ-отчёты, свидетельства, эскроу)
│   ├── alembic/                # Миграции базы данных
│   ├── requirements.txt
│   └── Dockerfile
│
├── frontend/
│   ├── src/
│   │   ├── app/                # Next.js App Router (каталог, дашборд, верификация, админка)
│   │   ├── components/         # UI-компоненты (Shadcn/ui, цепочка этапов, диалоги)
│   │   └── lib/                # Контекст авторизации, утилиты
│   ├── package.json
│   └── Dockerfile
│
├── ATest - Тесты/              # Дополнительный модуль: генератор интеграционных тестов (VS Code расширение)
│   ├── src/                    # Логика работы с контрактами, зависимостями и веб-панель
│   ├── package.json
│   └── README.md
│
├── nginx/                      # Nginx reverse proxy
├── docker-compose.yml          # Локальная и тестовая среда
├── docker-compose.prod.yml     # Продакшн-развертывание
└── .env.example                # Шаблон переменных окружения
```

---

## Быстрый запуск

### Вариант 1. Docker Compose (рекомендуемый)

1. Склонируйте репозиторий и создайте файл окружения:
   ```bash
   cp .env.example .env
   ```
   *(Укажите `OPENROUTER_API_KEY` для работы реального ИИ)*

2. Запустите стек:
   ```bash
   docker compose up -d --build
   ```

3. Сервисы будут доступны по адресам:
   - **Frontend**: [http://localhost:3000](http://localhost:3000)
   - **Backend API**: [http://localhost:8000](http://localhost:8000)
   - **Интерактивная документация (Swagger UI)**: [http://localhost:8000/docs](http://localhost:8000/docs)
   - **Публичный реестр верификации**: [http://localhost:3000/verify](http://localhost:3000/verify)

---

### Вариант 2. Локальный запуск без Docker

#### 1. База данных PostgreSQL
Запустите PostgreSQL локально или через легковесный контейнер:
```bash
docker run -d --name tochka_db -p 5432:5432 -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=tochka_rosta postgres:16-alpine
```

#### 2. Бэкенд (FastAPI)
```bash
cd backend
python -m venv venv

# Windows
.\venv\Scripts\activate
# Linux/macOS
source venv/bin/activate

pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

#### 3. Фронтенд (Next.js)
```bash
cd frontend
npm install
npm run dev
```

---

## Переменные окружения (.env)

| Переменная | Описание | Значение по умолчанию |
| :--- | :--- | :--- |
| `POSTGRES_USER` | Пользователь базы данных | `postgres` |
| `POSTGRES_PASSWORD` | Пароль базы данных | `postgres` |
| `POSTGRES_DB` | Имя базы данных | `tochka_rosta` |
| `SECRET_KEY` | Секретный ключ JWT-токенов | `tochka-rosta-secret-key` |
| `OPENROUTER_API_KEY` | API-ключ OpenRouter для нейросети | *опционально* |
| `OPENROUTER_MODEL` | Модель ИИ (русскоязычная генерация) | `google/gemini-2.5-flash` |
| `FRONTEND_URL` | Публичный адрес клиентского приложения | `http://localhost:3000` |

---

## Дополнительный проект: ATest (Генератор тестов с ИИ)

В папке `ATest - Тесты` (ATest) находится дополнительный инструмент для автоматической генерации интеграционных тестов на основе контрактов с использованием ИИ. Инструмент оформлен в виде расширения для Visual Studio Code и взаимодействует с генерационным бэкендом.

### Возможности ATest
- **Генерация на основе контрактов**: автоматическое построение позитивных и негативных тест-кейсов для методов без необходимости вручную писать моки внешней инфраструктуры.
- **Поддержка множества языков**: автоопределение стека проекта и генерация тестов для Python, TypeScript (Vitest), Go, C++ и других языков.
- **Интерактивный дашборд**: веб-панель управления в VS Code для просмотра контрактов и запуска генерации в один клик.

### Запуск и использование

1. **Сервер генерации (Go)**:
   Для обработки запросов генерации используется [go-server](https://github.com/Wql0t/go-server):
   ```bash
   git clone https://github.com/Wql0t/go-server.git
   cd go-server
   go run .
   ```

2. **Сборка и запуск расширения VS Code**:
   ```bash
   cd "ATest - Тесты"
   npm install
   npm run compile
   ```
   Откройте проект в Visual Studio Code и запустите расширение нажатием `F5` (Extension Development Host).

3. **Команды в VS Code (`Ctrl+Shift+P`)**:
   - `ATest: Init` — инициализация рабочего пространства и создание примеров контрактов.
   - `ATest: Open dashboard` — открытие панели управления с кнопкой **«Сгенерировать тесты»**.
   - `ATest: Generate test` — прямой запуск генерации тестов.
