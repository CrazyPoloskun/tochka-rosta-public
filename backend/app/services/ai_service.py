import io
import json
import logging
import re
from typing import Any, Optional
import httpx

from app.core.config import settings

logger = logging.getLogger("ai_service")


def _clean_str(val: Any) -> str:
    """Удаляет пробелы и случайные кавычки вокруг значений из .env."""
    if not val:
        return ""
    return str(val).strip().strip('"').strip("'")


def extract_text_from_pdf(pdf_bytes: bytes) -> str:
    """Извлекает сырой текст из PDF с помощью pypdf или аварийного декодера."""
    text_parts = []
    try:
        from pypdf import PdfReader
        reader = PdfReader(io.BytesIO(pdf_bytes))
        for page in reader.pages:
            page_text = page.extract_text()
            if page_text:
                text_parts.append(page_text)
    except Exception as e:
        logger.warning(f"pypdf extraction error: {e}")
        try:
            raw_str = pdf_bytes.decode('utf-8', errors='ignore')
            clean = re.sub(r'[\x00-\x08\x0b-\x1f\x7f-\xff]', ' ', raw_str)
            text_parts.append(clean[:4000])
        except Exception:
            text_parts.append("Не удалось извлечь текст из PDF")

    full_text = "\n".join(text_parts).strip()
    return full_text if full_text else "Документ не содержит текстового слоя."


def _clean_json_response(raw_text: str) -> str:
    """Удаляет markdown-разметку codeblock ```json ... ``` для чистого парсинга json."""
    cleaned = raw_text.strip()
    if cleaned.startswith("```json"):
        cleaned = cleaned[7:]
    elif cleaned.startswith("```"):
        cleaned = cleaned[3:]
    if cleaned.endswith("```"):
        cleaned = cleaned[:-3]
    return cleaned.strip()


def _extract_and_parse_json(raw_text: str) -> dict[str, Any]:
    """Надежный парсер JSON из ответа нейросети с поиском объекта и очисткой."""
    cleaned = _clean_json_response(raw_text)
    try:
        return json.loads(cleaned)
    except Exception:
        pass

    # Поиск первого сбалансированного блока { ... }
    match = re.search(r'(\{[\s\S]*\})', cleaned)
    if match:
        candidate = match.group(1).strip()
        try:
            return json.loads(candidate)
        except Exception:
            # Исправление типичных огрехов LLM: висящие запятые перед } или ]
            fixed = re.sub(r',\s*([\}\]])', r'\1', candidate)
            try:
                return json.loads(fixed)
            except Exception as e:
                logger.error(f"Failed to parse cleaned JSON block: {e}")

    raise ValueError(f"Ответ нейросети не содержит валидный JSON: {raw_text[:200]}...")


async def call_real_llm(
    messages: list[dict[str, str]],
    response_format_json: bool = False,
    temperature: float = 0.2,
) -> tuple[str, str]:
    """
    Выполняет реальный запрос к нейросети через доступные провайдеры:
    1. OpenRouter (если задан OPENROUTER_API_KEY)
    2. OpenAI / DeepSeek / Groq (если задан OPENAI_API_KEY)
    3. Google Gemini (если задан GEMINI_API_KEY)
    4. Neural Gateway (бесплатный открытый шлюз Pollinations/OpenAI)

    Возвращает кортеж: (content, provider_name).
    При невозможности связаться с нейросетью возбуждает RuntimeError.
    """
    openrouter_key = _clean_str(settings.OPENROUTER_API_KEY)
    openrouter_model = _clean_str(settings.OPENROUTER_MODEL) or "google/gemini-2.5-flash"
    openrouter_url = (_clean_str(settings.OPENROUTER_BASE_URL) or "https://openrouter.ai/api/v1").rstrip('/') + "/chat/completions"

    openai_key = _clean_str(settings.OPENAI_API_KEY)
    openai_model = _clean_str(settings.OPENAI_MODEL) or "gpt-4o-mini"
    openai_url = (_clean_str(settings.OPENAI_BASE_URL) or "https://api.openai.com/v1").rstrip('/') + "/chat/completions"

    gemini_key = _clean_str(settings.GEMINI_API_KEY)
    gemini_model = _clean_str(settings.GEMINI_MODEL) or "gemini-2.5-flash"

    # 1. Попытка через OpenRouter
    if openrouter_key:
        try:
            headers = {
                "Authorization": f"Bearer {openrouter_key}",
                "HTTP-Referer": "https://tochkarosta.ru",
                "X-Title": "Tochka Rosta DeepTech Platform",
                "Content-Type": "application/json",
            }
            payload: dict[str, Any] = {
                "model": openrouter_model,
                "messages": messages,
                "temperature": temperature,
            }
            if response_format_json:
                payload["response_format"] = {"type": "json_object"}

            ai_proxy = _clean_str(settings.OPENROUTER_PROXY or settings.AI_PROXY) or None
            async with httpx.AsyncClient(proxy=ai_proxy, timeout=httpx.Timeout(60.0, connect=15.0)) as client:
                res = await client.post(openrouter_url, headers=headers, json=payload)

                # Некоторые модели OpenRouter возвращают 400 при наличии response_format
                if res.status_code == 400 and response_format_json:
                    logger.info("OpenRouter model rejected response_format, retrying with raw text mode...")
                    payload.pop("response_format", None)
                    res = await client.post(openrouter_url, headers=headers, json=payload)

                if res.status_code == 200:
                    data = res.json()
                    choices = data.get("choices", [])
                    if choices:
                        content = choices[0].get("message", {}).get("content", "").strip()
                        if content:
                            return content, f"OpenRouter ({openrouter_model})"
                else:
                    logger.error(f"OpenRouter API error {res.status_code}: {res.text[:300]}")
        except Exception as e:
            logger.error(f"OpenRouter call failed: {e}")

    # 2. Попытка через OpenAI / DeepSeek / Compatible API
    if openai_key:
        try:
            headers = {
                "Authorization": f"Bearer {openai_key}",
                "Content-Type": "application/json",
            }
            payload = {
                "model": openai_model,
                "messages": messages,
                "temperature": temperature,
            }
            if response_format_json:
                payload["response_format"] = {"type": "json_object"}

            ai_proxy = _clean_str(settings.AI_PROXY or settings.OPENROUTER_PROXY) or None
            async with httpx.AsyncClient(proxy=ai_proxy, timeout=httpx.Timeout(60.0, connect=15.0)) as client:
                res = await client.post(openai_url, headers=headers, json=payload)
                if res.status_code == 400 and response_format_json:
                    payload.pop("response_format", None)
                    res = await client.post(openai_url, headers=headers, json=payload)

                if res.status_code == 200:
                    data = res.json()
                    choices = data.get("choices", [])
                    if choices:
                        content = choices[0].get("message", {}).get("content", "").strip()
                        if content:
                            return content, f"OpenAI ({openai_model})"
                else:
                    logger.error(f"OpenAI API error {res.status_code}: {res.text[:300]}")
        except Exception as e:
            logger.error(f"OpenAI call failed: {e}")

    # 3. Попытка через Google Gemini Direct API
    if gemini_key:
        try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{gemini_model}:generateContent?key={gemini_key}"
            gemini_contents = []
            for msg in messages:
                role = "user" if msg["role"] in ("user", "system") else "model"
                gemini_contents.append({
                    "role": role,
                    "parts": [{"text": msg["content"]}]
                })
            payload = {
                "contents": gemini_contents,
                "generationConfig": {
                    "temperature": temperature,
                }
            }
            if response_format_json:
                payload["generationConfig"]["responseMimeType"] = "application/json"

            ai_proxy = _clean_str(settings.AI_PROXY or settings.OPENROUTER_PROXY) or None
            async with httpx.AsyncClient(proxy=ai_proxy, timeout=httpx.Timeout(60.0, connect=15.0)) as client:
                res = await client.post(url, json=payload)
                if res.status_code == 200:
                    data = res.json()
                    candidates = data.get("candidates", [])
                    if candidates:
                        parts = candidates[0].get("content", {}).get("parts", [])
                        if parts and "text" in parts[0]:
                            content = parts[0]["text"].strip()
                            if content:
                                return content, f"Google Gemini ({gemini_model})"
                else:
                    logger.error(f"Gemini API error {res.status_code}: {res.text[:300]}")
        except Exception as e:
            logger.error(f"Gemini API call failed: {e}")

    # 4. Резервный реальный нейросетевой шлюз (Real Neural Engine)
    try:
        url = settings.FALLBACK_AI_URL
        payload = {
            "model": settings.FALLBACK_AI_MODEL,
            "messages": messages,
            "temperature": temperature,
        }
        async with httpx.AsyncClient(timeout=httpx.Timeout(60.0, connect=15.0)) as client:
            res = await client.post(url, json=payload)
            if res.status_code == 200:
                data = res.json()
                choices = data.get("choices", [])
                if choices:
                    content = choices[0].get("message", {}).get("content", "").strip()
                    if content:
                        model_name = data.get("model", settings.FALLBACK_AI_MODEL)
                        return content, f"Neural Gateway ({model_name})"
            else:
                logger.error(f"Fallback Neural Gateway error {res.status_code}: {res.text[:300]}")
    except Exception as e:
        logger.error(f"Fallback Neural Gateway call failed: {e}")

    # Никаких моковых заглушек: выбрасываем ошибку
    raise RuntimeError(
        "ИИ-сервис временно недоступен: не удалось связаться с нейросетевыми шлюзами. "
        "Проверьте правильность OPENROUTER_API_KEY или подключение к сети."
    )


# ==============================================================================
# 1. ПАРСИНГ СПЕЦИФИКАЦИЙ И ПАТЕНТОВ (PDF В СТРУКТУРУ ПРОЕКТА ЧЕРЕЗ ИИ)
# ==============================================================================

async def parse_pdf_to_project_data(pdf_text: str) -> dict[str, Any]:
    """
    Анализирует текст спецификации/патента с помощью реальной нейросети.
    Формирует строго валидную структуру проекта.
    """
    if not pdf_text or len(pdf_text.strip()) < 30:
        raise ValueError("Текст документа слишком короткий или не содержит содержательного описания разработки.")

    system_prompt = (
        "Ты — ведущий эксперт по научно-технической экспертизе инноваций и трансферу технологий НИОКР "
        "платформы «Точка Роста». Твоя задача — внимательно изучить научный документ/патент/ТЗ и извлечь "
        "реальные технологические параметры, сформировав строго валидный JSON карточки проекта без лишнего текста.\n\n"
        "Формат ответа (СТРОГО JSON):\n"
        "{\n"
        '  "title": "Ёмкое технологическое название разработки (до 100 символов)",\n'
        '  "summary": "Развернутое структурированное резюме для инвестора: суть технологии, новизна, ключевые преимущества (150-350 слов)",\n'
        '  "category": "Одна из категорий: Новые материалы | Биотехнологии | Робототехника | Микроэлектроника | Энергетика | Искусственный интеллект | Химия | Медицинские технологии",\n'
        '  "trl_level": число от 1 до 9,\n'
        '  "trl_rationale": "Обоснование уровня TRL на основе данных документа",\n'
        '  "budget_total": ориентировочный бюджет в рублях (целое число, например 2500000),\n'
        '  "duration_months": ориентировочный срок в месяцах (целое число),\n'
        '  "milestones": [\n'
        '    {"step": 1, "title": "Название этапа 1", "amount": число, "duration": "2 мес.", "deliverables": "Ожидаемый результат этапа"},\n'
        '    {"step": 2, "title": "Название этапа 2", "amount": число, "duration": "3 мес.", "deliverables": "Ожидаемый результат этапа"},\n'
        '    {"step": 3, "title": "Название этапа 3", "amount": число, "duration": "2 мес.", "deliverables": "Ожидаемый результат этапа"}\n'
        '  ],\n'
        '  "competitive_advantages": ["Преимущество 1", "Преимущество 2", "Преимущество 3"]\n'
        "}"
    )

    user_prompt = f"Текст входящего научного документа/патента:\n\n{pdf_text[:14000]}"

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt},
    ]

    llm_output, provider = await call_real_llm(messages, response_format_json=True, temperature=0.1)
    parsed = _extract_and_parse_json(llm_output)

    if not isinstance(parsed, dict) or "title" not in parsed:
        raise ValueError("Нейросеть вернула некорректный формат спецификации проекта.")

    parsed["source"] = "real_neural_network"
    parsed["model_used"] = provider
    return parsed


# ==============================================================================
# 2. САММАРИЗАЦИЯ ОТЧЁТОВ НИОКР (ДЛЯ ИНВЕСТОРА ЧЕРЕЗ ИИ)
# ==============================================================================

async def generate_report_ai_summary(raw_report: str, milestone_title: str) -> str:
    """
    Генерирует 3 ключевых аналитических пункта для инвестора на основе реального отчёта НИИ
    с помощью нейросети.
    """
    if not raw_report or len(raw_report.strip()) < 10:
        raise ValueError("Текст научно-технического отчета отсутствует или слишком мал для анализа.")

    system_prompt = (
        "Ты — независимый технический аудитор и советник инвестора по контролю НИОКР. "
        "Твоя задача — проанализировать научно-технический отчёт лаборатории/НИИ по этапу проекта "
        "и составить краткую, кристально понятную и честную выжимку для бизнес-инвестора.\n\n"
        "Формат строго из 3 пунктов с заголовками в markdown:\n"
        "• **Что сделано**: конкретные результаты, что фактически изготовлено, синтезировано или испытано.\n"
        "• **Соблюдение сроков**: выдержан ли дедлайн, есть ли задержки и чем обусловлены.\n"
        "• **Оценка рисков и рекомендация**: риски выполнения ТЗ, готовность к подписанию акта и разблокировке эскроу-транша."
    )

    user_prompt = f"Этап: «{milestone_title}»\n\nОтчёт лаборатории:\n{raw_report[:8000]}"

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt},
    ]

    llm_output, _ = await call_real_llm(messages, temperature=0.2)
    return llm_output.strip()


# ==============================================================================
# 3. ИИ-АНАЛИЗ ТИКЕТОВ ТЕХПОДДЕРЖКИ
# ==============================================================================

async def summarize_ticket_ai(subject: str, description: str, conversation_text: str = "") -> dict[str, str]:
    """Анализирует тикет пользователя с помощью нейросети и предлагает план решения."""
    system_prompt = (
        "Ты — старший куратор поддержки платформы трансфера технологий «Точка Роста». "
        "Проанализируй обращение пользователя и сформируй JSON:\n"
        "{\n"
        '  "ai_summary": "Краткая суть проблемы (1-2 предложения)",\n'
        '  "ai_sentiment": "Тональность: нейтральная | позитивная | негативная / сбой | финансовая тревога",\n'
        '  "ai_suggested_action": "Конкретный рекомендуемый шаг или текст ответа куратора",\n'
        '  "priority": "low | medium | high | urgent"\n'
        "}"
    )

    user_prompt = f"Тема: {subject}\nОписание: {description}\nПереписка:\n{conversation_text[:4000]}"

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt},
    ]

    llm_output, _ = await call_real_llm(messages, response_format_json=True, temperature=0.1)
    parsed = _extract_and_parse_json(llm_output)
    return parsed


# ==============================================================================
# 4. ГЕНЕРАТОР ТЕХНИЧЕСКОГО ЗАДАНИЯ (ТЗ НА НИОКР ПО ГОСТ 15.016-2016)
# ==============================================================================

async def generate_task_tz_ai(title: str, query: str, industry: Optional[str] = None) -> dict[str, Any]:
    """
    Генерирует глубокое академическое ТЗ на НИОКР с физико-химическими и инженерными требованиями
    исключительно на базе реальной нейросети.
    """
    if not query or len(query.strip()) < 3:
        raise ValueError("Пожалуйста, опишите задачу или идею более подробно.")

    system_prompt = (
        "Ты — главный научный консультант и технический директор R&D платформы «Точка Роста». "
        "Инвестор или промышленный заказчик описывает задачу на простом бизнес-языке. "
        "Твоя цель — трансформировать это описание в строгое академическое Техническое Задание на НИОКР "
        "в полном соответствии со стандартами ГОСТ 15.016-2016 и отраслевыми нормативами РФ.\n\n"
        "Ответь СТРОГО валидным JSON без лишнего сопроводительного текста:\n"
        "{\n"
        '  "title": "Точное академическое наименование НИОКР",\n'
        '  "category": "Отрасль исследования (Новые материалы и химия | Робототехника и мехатроника | Биотехнологии и медицина | Электроника и микросхемы | Энергетика | ИИ и IT | Приборостроение)",\n'
        '  "target_trl_start": 3,\n'
        '  "target_trl_end": 6,\n'
        '  "suggested_budget": ориентировочный бюджет в рублях (целое число, например 2500000),\n'
        '  "suggested_deadline": "ориентировочный срок (например: 6 месяцев)",\n'
        '  "scientific_summary": "Академическая формулировка предмета, цели исследования и научно-технической гипотезы",\n'
        '  "technical_requirements": [\n'
        '    "Физико-механические, температурные или химические параметры с числовыми диапазонами и допусками",\n'
        '    "Требования к сырью, материалам и отечественной компонентной базе",\n'
        '    "Устойчивость к эксплуатационным нагрузкам и климатическим факторам"\n'
        '  ],\n'
        '  "deliverables": [\n'
        '    "Патентный формуляр по ГОСТ 15.012-84 и аналитический отчёт",\n'
        '    "Лабораторный образец / функциональный прототип",\n'
        '    "Проект технических условий (ТУ) и программа-методика испытаний (ПМИ)"\n'
        '  ],\n'
        '  "testing_methodology": [\n'
        '    "Стендовые испытания на соответствие целевым параметрам",\n'
        '    "Спектрометрический или физико-механический анализ структуры",\n'
        '    "Ускоренные климатические и ресурсные испытания"\n'
        '  ],\n'
        '  "stages": [\n'
        '    "Этап 1: Патентный поиск, аналитическое моделирование и разработка ТУ (1-2 мес.)",\n'
        '    "Этап 2: Экспериментальный синтез / прототипирование и стендовая отладка (2-3 мес.)",\n'
        '    "Этап 3: Приёмочные испытания опытной партии и регистрация РИД (1-2 мес.)"\n'
        '  ],\n'
        '  "ip_ownership_recommendation": "Рекомендация по защите прав: оформление патента на изобретение на имя инвестора с сохранением за НИИ авторского вознаграждения.",\n'
        '  "description": "Сводный текст ТЗ для карточки тендера, объединяющий цель, нормативы и ожидаемый результат"\n'
        "}"
    )

    user_prompt = f"Наименование/Тема: {title or 'Автоопределение'}\nОтрасль: {industry or 'Автоопределение'}\nБизнес-запрос заказчика:\n{query.strip()}"

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt},
    ]

    llm_output, provider = await call_real_llm(messages, response_format_json=True, temperature=0.15)
    parsed = _extract_and_parse_json(llm_output)

    if not isinstance(parsed, dict) or "title" not in parsed:
        raise ValueError("Нейросеть вернула неполный ответ при генерации ТЗ.")

    parsed["source"] = "real_neural_network"
    parsed["model_used"] = provider
    return parsed


# ==============================================================================
# 5. СТАТУС ИИ-СЕРВИСА
# ==============================================================================

def get_ai_status() -> dict[str, Any]:
    """Возвращает информацию о текущей активной конфигурации нейросетевых шлюзов."""
    openrouter_key = _clean_str(settings.OPENROUTER_API_KEY)
    openai_key = _clean_str(settings.OPENAI_API_KEY)
    gemini_key = _clean_str(settings.GEMINI_API_KEY)

    configured_providers = []
    active = "Neural Gateway"

    if openrouter_key:
        model = _clean_str(settings.OPENROUTER_MODEL) or "google/gemini-2.5-flash"
        configured_providers.append(f"OpenRouter ({model})")
        active = f"OpenRouter ({model})"
    if openai_key:
        model = _clean_str(settings.OPENAI_MODEL) or "gpt-4o-mini"
        configured_providers.append(f"OpenAI/DeepSeek ({model})")
        if not openrouter_key:
            active = f"OpenAI ({model})"
    if gemini_key:
        model = _clean_str(settings.GEMINI_MODEL) or "gemini-2.5-flash"
        configured_providers.append(f"Google Gemini ({model})")
        if not openrouter_key and not openai_key:
            active = f"Google Gemini ({model})"

    configured_providers.append(f"Neural Gateway ({settings.FALLBACK_AI_MODEL})")

    key_preview = "не задан"
    if openrouter_key:
        key_preview = f"{openrouter_key[:6]}...{openrouter_key[-4:]}" if len(openrouter_key) > 10 else "задан"

    return {
        "is_configured": bool(openrouter_key or openai_key or gemini_key),
        "active_provider": active,
        "key_preview": key_preview,
        "available_providers": configured_providers,
        "mock_data_enabled": False,
        "status": "online",
    }
