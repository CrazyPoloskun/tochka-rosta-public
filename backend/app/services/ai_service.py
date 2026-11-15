import io
import json
import logging
import os
import re
import asyncio
import urllib.request
import urllib.error
from typing import Any, Optional

try:
    import httpx
except ImportError:
    httpx = None

from app.core.config import settings

logger = logging.getLogger("ai_service")


class _SafeHttpResponse:
    def __init__(self, status_code: int, text: str):
        self.status_code = status_code
        self.text = text

    def json(self) -> Any:
        try:
            return json.loads(self.text) if self.text else {}
        except Exception:
            return {}


def _create_httpx_client(timeout: float = 60.0, proxy: str | None = None) -> Any:
    """Создаёт httpx.AsyncClient с поддержкой proxy для любых версий httpx (<=0.27 и >=0.28)."""
    timeout_obj = httpx.Timeout(timeout, connect=15.0)
    if not proxy:
        return httpx.AsyncClient(timeout=timeout_obj)
    try:
        # httpx >= 0.28
        return httpx.AsyncClient(timeout=timeout_obj, proxy=proxy)
    except TypeError:
        # httpx <= 0.27
        return httpx.AsyncClient(timeout=timeout_obj, proxies=proxy)


def _sync_urllib_post(
    url: str,
    headers: dict,
    payload: dict,
    proxy: str | None = None,
    timeout: float = 60.0,
) -> _SafeHttpResponse:
    data_bytes = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(url, data=data_bytes, headers=headers or {}, method="POST")
    try:
        handlers = []
        if proxy:
            handlers.append(urllib.request.ProxyHandler({"http": proxy, "https": proxy}))
        opener = urllib.request.build_opener(*handlers)
        with opener.open(req, timeout=timeout) as resp:
            body = resp.read().decode("utf-8", errors="ignore")
            return _SafeHttpResponse(status_code=resp.status, text=body)
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="ignore")
        return _SafeHttpResponse(status_code=e.code, text=body)
    except Exception as e:
        logger.error(f"urllib request failed: {e}")
        return _SafeHttpResponse(status_code=500, text=str(e))


async def _safe_http_post(
    url: str,
    headers: dict | None = None,
    payload: dict | None = None,
    proxy: str | None = None,
    timeout: float = 60.0,
) -> _SafeHttpResponse:
    if httpx is not None:
        try:
            async with _create_httpx_client(timeout=timeout, proxy=proxy) as client:
                res = await client.post(url, headers=headers or {}, json=payload)
                return _SafeHttpResponse(status_code=res.status_code, text=res.text)
        except Exception as e:
            logger.warning(f"httpx call failed via proxy {proxy or 'direct'} ({e})")
            if proxy:
                # Если прокси (gluetun) недоступен или перезапускается, пробуем напрямую
                try:
                    logger.info("Attempting direct connection fallback to OpenRouter...")
                    async with _create_httpx_client(timeout=timeout, proxy=None) as direct_client:
                        res = await direct_client.post(url, headers=headers or {}, json=payload)
                        return _SafeHttpResponse(status_code=res.status_code, text=res.text)
                except Exception as direct_e:
                    logger.warning(f"direct httpx also failed: {direct_e}")

    hdrs = dict(headers or {})
    if "Content-Type" not in hdrs:
        hdrs["Content-Type"] = "application/json"
    return await asyncio.to_thread(_sync_urllib_post, url, hdrs, payload or {}, proxy, timeout)


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
    Выполняет реальный запрос к нейросети строго через OpenRouter API.
    Используется исключительно OpenRouter.

    Возвращает кортеж: (content, provider_name).
    При отсутствии ключа или ошибке API возбуждает RuntimeError.
    """
    openrouter_key = _clean_str(settings.OPENROUTER_API_KEY)
    openrouter_model = _clean_str(settings.OPENROUTER_MODEL) or "google/gemini-2.5-flash"
    openrouter_url = (_clean_str(settings.OPENROUTER_BASE_URL) or "https://openrouter.ai/api/v1").rstrip('/') + "/chat/completions"

    if not openrouter_key:
        raise RuntimeError(
            "ИИ-сервис платформы сконфигурирован исключительно для работы через OpenRouter. "
            "Ключ OPENROUTER_API_KEY не задан в настройках (.env). "
            "Пожалуйста, укажите валидный OPENROUTER_API_KEY."
        )

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

    ai_proxy = (
        _clean_str(settings.OPENROUTER_PROXY)
        or _clean_str(settings.AI_PROXY)
        or _clean_str(os.environ.get("OPENROUTER_PROXY"))
        or _clean_str(os.environ.get("AI_PROXY"))
        or _clean_str(os.environ.get("HTTPS_PROXY"))
        or _clean_str(os.environ.get("HTTP_PROXY"))
        or _clean_str(os.environ.get("https_proxy"))
        or _clean_str(os.environ.get("http_proxy"))
        or None
    )

    logger.info(f"OpenRouter request: model={openrouter_model}, proxy={ai_proxy or 'direct'}")

    try:
        res = await _safe_http_post(openrouter_url, headers=headers, payload=payload, proxy=ai_proxy)

        # Если прокси вернул 502/503/504 (сбой WireGuard/Gluetun), пробуем напрямую
        if res.status_code in (502, 503, 504) and ai_proxy:
            logger.warning(f"Proxy {ai_proxy} returned status {res.status_code}. Retrying direct connection...")
            res = await _safe_http_post(openrouter_url, headers=headers, payload=payload, proxy=None)

        # Некоторые модели OpenRouter возвращают 400 при наличии response_format
        if res.status_code == 400 and response_format_json:
            logger.info("OpenRouter model rejected response_format, retrying with raw text mode...")
            payload.pop("response_format", None)
            res = await _safe_http_post(openrouter_url, headers=headers, payload=payload, proxy=ai_proxy)

        if res.status_code == 200:
            data = res.json()
            choices = data.get("choices", [])
            if choices:
                content = choices[0].get("message", {}).get("content", "").strip()
                if content:
                    return content, f"OpenRouter ({openrouter_model})"
            raise RuntimeError(f"OpenRouter вернул некорректный ответ: {data}")
        else:
            err_msg = res.text[:300]
            logger.error(f"OpenRouter API error {res.status_code}: {err_msg}")
            raise RuntimeError(f"OpenRouter API вернул код {res.status_code}: {err_msg}")
    except Exception as e:
        logger.error(f"OpenRouter call failed: {e}")
        raise RuntimeError(f"Ошибка вызова OpenRouter ({openrouter_model}): {e}")


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
    """Возвращает информацию о текущей активной конфигурации нейросетевого шлюза OpenRouter."""
    openrouter_key = _clean_str(settings.OPENROUTER_API_KEY)
    openrouter_model = _clean_str(settings.OPENROUTER_MODEL) or "google/gemini-2.5-flash"
    ai_proxy = (
        _clean_str(settings.OPENROUTER_PROXY)
        or _clean_str(settings.AI_PROXY)
        or _clean_str(os.environ.get("OPENROUTER_PROXY"))
        or _clean_str(os.environ.get("AI_PROXY"))
        or _clean_str(os.environ.get("HTTPS_PROXY"))
        or _clean_str(os.environ.get("HTTP_PROXY"))
        or None
    )

    key_preview = "не задан"
    if openrouter_key:
        key_preview = f"{openrouter_key[:6]}...{openrouter_key[-4:]}" if len(openrouter_key) > 10 else "задан"

    return {
        "is_configured": bool(openrouter_key),
        "active_provider": f"OpenRouter ({openrouter_model})",
        "key_preview": key_preview,
        "proxy_configured": bool(ai_proxy),
        "proxy": ai_proxy or "direct",
        "available_providers": [f"OpenRouter ({openrouter_model})"],
        "mock_data_enabled": False,
        "status": "online" if openrouter_key else "needs_key",
    }
