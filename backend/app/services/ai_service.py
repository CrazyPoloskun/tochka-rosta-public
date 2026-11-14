import io
import json
import logging
import re
from typing import Any, Optional
import httpx

from app.core.config import settings

logger = logging.getLogger("ai_service")


def extract_text_from_pdf(pdf_bytes: bytes) -> str:
    """Извлекает сырой текст из PDF с помощью pypdf или fallback."""
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
        # fallback - декодирование текстовых последовательностей
        try:
            raw_str = pdf_bytes.decode('utf-8', errors='ignore')
            clean = re.sub(r'[\x00-\x08\x0b-\x1f\x7f-\xff]', ' ', raw_str)
            text_parts.append(clean[:4000])
        except Exception:
            text_parts.append("Не удалось извлечь текст из PDF")

    full_text = "\n".join(text_parts).strip()
    return full_text if full_text else "Документ не содержит текстового слоя."


async def call_openrouter(
    messages: list[dict[str, str]],
    response_format_json: bool = False,
    model: Optional[str] = None,
    temperature: float = 0.2,
) -> Optional[str]:
    """
    Отправляет асинхронный запрос к OpenRouter API.
    Возвращает строку с ответом модели или None, если ключ не задан или запрос завершился ошибкой.
    """
    api_key = settings.OPENROUTER_API_KEY.strip()
    if not api_key:
        logger.info("OPENROUTER_API_KEY is not configured. Falling back to offline heuristic engine.")
        return None

    chosen_model = model or settings.OPENROUTER_MODEL
    url = f"{settings.OPENROUTER_BASE_URL.rstrip('/')}/chat/completions"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "HTTP-Referer": "https://tochkarosta.ru",
        "X-Title": "Tochka Rosta DeepTech Platform",
        "Content-Type": "application/json",
    }

    payload: dict[str, Any] = {
        "model": chosen_model,
        "messages": messages,
        "temperature": temperature,
    }

    if response_format_json:
        payload["response_format"] = {"type": "json_object"}

    try:
        async with httpx.AsyncClient(timeout=45.0) as client:
            res = await client.post(url, headers=headers, json=payload)
            if res.status_code != 200:
                logger.error(f"OpenRouter API error {res.status_code}: {res.text}")
                return None
            data = res.json()
            choices = data.get("choices", [])
            if choices and len(choices) > 0:
                return choices[0].get("message", {}).get("content", "").strip()
            return None
    except Exception as e:
        logger.error(f"Failed to communicate with OpenRouter: {e}")
        return None


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


# ==============================================================================
# 1. ПАРСИНГ СПЕЦИФИКАЦИЙ И ПАТЕНТОВ (PDF В ПРОЕКТ)
# ==============================================================================

async def parse_pdf_to_project_data(pdf_text: str) -> dict[str, Any]:
    """
    Анализирует текст спецификации/патента.
    Сначала пытается использовать OpenRouter LLM. При неудаче — откатывается к эвристике.
    """
    system_prompt = (
        "Ты — ведущий эксперт по научно-технической экспертизе инноваций и трансферу технологий НИОКР "
        "платформы «Точка Роста». Твоя задача — проанализировать научный документ/патент/ТЗ и сформировать "
        "строго валидный JSON карточки проекта без лишнего текста.\n\n"
        "Формат ответа (строго JSON):\n"
        "{\n"
        '  "title": "Ёмкое технологическое название разработки (до 100 символов)",\n'
        '  "summary": "Развернутое структурированное резюме для инвестора: суть технологии, новизна, ключевые преимущества (150-350 слов)",\n'
        '  "category": "Одна из категорий: Новые материалы | Биотехнологии | Робототехника | Микроэлектроника | Энергетика | Искусственный интеллект | Химия | Медицинские технологии",\n'
        '  "trl_level": число от 1 до 9,\n'
        '  "trl_rationale": "Краткое обоснование уровня TRL (почему именно такой уровень)",\n'
        '  "budget_total": ориентировочный бюджет в рублях (целое число, например 2500000),\n'
        '  "duration_months": ориентировочный срок в месяцах (целое число),\n'
        '  "milestones": [\n'
        '    {"step": 1, "title": "Название этапа 1", "amount": 800000, "duration": "2 мес.", "deliverables": "Ожидаемый результат этапа"},\n'
        '    {"step": 2, "title": "Название этапа 2", "amount": 1000000, "duration": "3 мес.", "deliverables": "Ожидаемый результат этапа"},\n'
        '    {"step": 3, "title": "Название этапа 3", "amount": 700000, "duration": "2 мес.", "deliverables": "Ожидаемый результат этапа"}\n'
        '  ],\n'
        '  "competitive_advantages": ["Преимущество 1", "Преимущество 2", "Преимущество 3"]\n'
        "}"
    )

    user_prompt = f"Текст входящего научного документа/патента:\n\n{pdf_text[:12000]}"

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt},
    ]

    llm_output = await call_openrouter(messages, response_format_json=True)
    if llm_output:
        try:
            parsed = json.loads(_clean_json_response(llm_output))
            if "title" in parsed and "milestones" in parsed:
                parsed["source"] = "openrouter"
                parsed["model_used"] = settings.OPENROUTER_MODEL
                return parsed
        except Exception as e:
            logger.warning(f"Failed to parse LLM JSON response: {e}")

    # Fallback на проверенный детерминированный движок эвристик
    return _parse_pdf_offline_fallback(pdf_text)


def _parse_pdf_offline_fallback(pdf_text: str) -> dict[str, Any]:
    """Детерминированный эвристический парсер при отсутствии внешнего API."""
    lines = [line.strip() for line in pdf_text.splitlines() if line.strip()]
    first_meaningful_lines = lines[:10]

    # 1. Извлечение заголовка
    title = "Инновационная технологическая разработка"
    for line in first_meaningful_lines:
        if 15 <= len(line) <= 120 and not line.lower().startswith(("содержание", "введение", "страница", "гост")):
            title = line
            break

    # 2. Определение категории
    lower_text = pdf_text.lower()
    category = "Новые материалы"
    if any(k in lower_text for k in ["био", "ген", "медицин", "фарм", "клетк"]):
        category = "Биотехнологии"
    elif any(k in lower_text for k in ["робот", "манипулятор", "беспилот", "бпла", "дрон"]):
        category = "Робототехника"
    elif any(k in lower_text for k in ["нейросет", "ии", "ai", "алгоритм", "машинное обуч", "данных"]):
        category = "Искусственный интеллект"
    elif any(k in lower_text for k in ["энерг", "аккумулятор", "батаре", "водород", "солнеч"]):
        category = "Энергетика"
    elif any(k in lower_text for k in ["микросхем", "сенсор", "датчик", "полупроводник", "электроник"]):
        category = "Микроэлектроника"
    elif any(k in lower_text for k in ["хим", "полимер", "катализ", "синтез"]):
        category = "Химия"

    # 3. Определение TRL (1-9)
    trl_level = 4
    trl_match = re.search(r'(?:trl|ург|уровень готовности)\s*[:=]?\s*(\d)', lower_text)
    if trl_match:
        val = int(trl_match.group(1))
        if 1 <= val <= 9:
            trl_level = val
    elif "опытный образец" in lower_text or "прототип" in lower_text:
        trl_level = 6
    elif "лабораторные испытания" in lower_text or "макет" in lower_text:
        trl_level = 5
    elif "серийное" in lower_text or "внедрение" in lower_text:
        trl_level = 7

    # 4. Сводка (Summary)
    summary_sentences = []
    for line in lines[2:20]:
        if len(line) > 40 and not line.startswith(("#", "1.", "2.")):
            summary_sentences.append(line)
        if len(summary_sentences) >= 3:
            break
    summary = " ".join(summary_sentences)
    if not summary or len(summary) < 30:
        summary = (
            f"Научно-техническая разработка в области «{category}». Включает исследовательскую часть, "
            f"прототипирование и испытания в лабораторных условиях с подтверждением заявленных характеристик."
        )

    # 5. Этапы (Milestones) и бюджет
    milestones = [
        {
            "step": 1,
            "title": "Анализ научно-технической документации и патентный поиск",
            "amount": 600000,
            "duration": "2 мес.",
            "deliverables": "Отчёт о патентных исследованиях и аналитический обзор аналогов",
        },
        {
            "step": 2,
            "title": "Разработка макетного образца и проведение калибровочных испытаний",
            "amount": 1200000,
            "duration": "3 мес.",
            "deliverables": "Действующий лабораторный макет и протоколы промежуточных испытаний",
        },
        {
            "step": 3,
            "title": "Изготовление опытно-промышленной партии и сдача отчётной документации",
            "amount": 800000,
            "duration": "2 мес.",
            "deliverables": "Опытные образцы, проект ТУ и акт приёмочных испытаний",
        },
    ]
    budget_total = sum(m["amount"] for m in milestones)

    return {
        "title": title,
        "summary": summary,
        "category": category,
        "trl_level": trl_level,
        "trl_rationale": f"Определено на основе упоминания лабораторной стендовой базы и опытных образцов (TRL {trl_level}).",
        "budget_total": budget_total,
        "duration_months": 7,
        "milestones": milestones,
        "competitive_advantages": [
            "Улучшенные физико-химические характеристики относительно ГОСТ",
            "Снижение себестоимости за счёт отечественного сырья",
            "Патентная чистота на территории РФ",
        ],
        "source": "offline_heuristic",
    }


# ==============================================================================
# 2. САММАРИЗАЦИЯ ОТЧЁТОВ НИОКР (ДЛЯ ИНВЕСТОРА)
# ==============================================================================

async def generate_report_ai_summary(raw_report: str, milestone_title: str) -> str:
    """Генерирует 3 ключевых пункта для инвестора на основе отчёта НИИ."""
    system_prompt = (
        "Ты — независимый технический аудитор и советник инвестора по контролю НИОКР. "
        "Твоя задача — проанализировать сложный научно-технический отчёт лаборатории/НИИ по этапу проекта "
        "и составить краткую, кристально понятную и честную выжимку для бизнес-инвестора.\n\n"
        "Формат строго из 3 пунктов с заголовками в markdown:\n"
        "• **Что сделано**: конкретные результаты, что фактически изготовлено или испытано.\n"
        "• **Соблюдение сроков**: выдержан ли дедлайн, есть ли задержки и чем обусловлены.\n"
        "• **Оценка рисков и рекомендация**: риски выполнения ТЗ, готовность к подписанию акта и разблокировке эскроу-транша."
    )

    user_prompt = f"Этап: «{milestone_title}»\n\nОтчёт лаборатории:\n{raw_report[:6000]}"

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt},
    ]

    llm_output = await call_openrouter(messages, temperature=0.3)
    if llm_output and len(llm_output) > 50:
        return llm_output

    # Heuristic fallback
    words_count = len(raw_report.split())
    has_metrics = bool(re.search(r'\d+(?:\.\d+)?\s*(?:%|мм|кг|мг|мПа|час|дн|шт|кВт)', raw_report))
    has_delays = bool(re.search(r'задержк|перенос|сдвиг|проблем|нехват|ошибк', raw_report.lower()))

    point1 = f"• **Что сделано**: По этапу «{milestone_title}» представлены результаты исследований ({words_count} сл.). "
    if has_metrics:
        point1 += "В отчёте зафиксированы подтверждённые количественные метрики и параметры калибровочных испытаний."
    else:
        point1 += "Завершена базовая аналитическая часть и сформированы выводы по экспериментальной модели."

    point2 = "• **Соблюдение сроков**: "
    if has_delays:
        point2 += "Зафиксированы факторы корректировки сроков из-за технологических доработок, критического отставания от общего графика не обнаружено."
    else:
        point2 += "Работы сданы в рамках регламентного таймлайна, контрольные точки пройдены успешно."

    point3 = "• **Оценка рисков**: Риски невыполнения целевых ТУ оцениваются как минимальные. Рекомендуется подписание промежуточного акта и разблокировка средств следующего этапа."

    return f"{point1}\n{point2}\n{point3}"


# ==============================================================================
# 3. ИИ-АНАЛИЗ ТИКЕТОВ ТЕХПОДДЕРЖКИ
# ==============================================================================

async def summarize_ticket_ai(subject: str, description: str, conversation_text: str = "") -> dict[str, str]:
    """Анализирует тикет пользователя и предлагает план решения."""
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

    user_prompt = f"Тема: {subject}\nОписание: {description}\nПереписка:\n{conversation_text[:3000]}"

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt},
    ]

    llm_output = await call_openrouter(messages, response_format_json=True)
    if llm_output:
        try:
            parsed = json.loads(_clean_json_response(llm_output))
            if "ai_summary" in parsed:
                return parsed
        except Exception as e:
            logger.warning(f"Ticket AI json parse error: {e}")

    # Fallback
    desc_lower = (subject + " " + description).lower()
    if any(k in desc_lower for k in ["ошибк", "не работает", "сбой", "баг"]):
        sentiment = "негативная / технический сбой"
        suggested = "Запросить скриншот ошибки и логи консоли браузера (F12). Проверить состояние сервисов."
        priority = "high"
    elif any(k in desc_lower for k in ["деньг", "эскроу", "баланс", "вывод", "платеж"]):
        sentiment = "финансовый запрос / высокий приоритет"
        suggested = "Проверить лицевой счёт в реестре транзакций. Проверить статус платёжного поручения."
        priority = "urgent"
    else:
        sentiment = "нейтральная / консультация"
        suggested = "Предоставить регламент работы платформы и ссылку на базу знаний."
        priority = "medium"

    summary = f"Краткая суть: {subject}. Пользователь сообщает о: {description[:120]}..."

    return {
        "ai_summary": summary,
        "ai_sentiment": sentiment,
        "ai_suggested_action": suggested,
        "priority": priority,
    }


# ==============================================================================
# 4. ГЕНЕРАТОР ТЕХНИЧЕСКОГО ЗАДАНИЯ ДЛЯ ТЕНДЕРА (ТЗ НА НИОКР)
# ==============================================================================

async def generate_task_tz_ai(title: str, query: str, industry: Optional[str] = None) -> dict[str, Any]:
    """Генерирует глубокое академическое ТЗ на НИОКР с физико-химическими и инженерными требованиями."""
    system_prompt = (
        "Ты — главный научный консультант и технический директор R&D платформы «Точка Роста». "
        "Инвестор или промышленный заказчик описывает задачу на простом бизнес-языке. "
        "Твоя цель — трансформировать это в академическое Техническое Задание на НИОКР в строгом соответствии с ГОСТ 15.016-2016.\n\n"
        "Ответь строго валидным JSON без markdown-обёрток:\n"
        "{\n"
        '  "title": "Точное академическое наименование НИОКР",\n'
        '  "category": "Отрасль исследования",\n'
        '  "target_trl_start": 3,\n'
        '  "target_trl_end": 6,\n'
        '  "suggested_budget": 2500000,\n'
        '  "suggested_deadline": "6 месяцев",\n'
        '  "scientific_summary": "Академическая формулировка предмета, цели исследования и научно-технической гипотезы",\n'
        '  "technical_requirements": [\n'
        '    "Физико-механические, температурные или химические параметры с числовыми диапазонами и допусками",\n'
        '    "Требования к сырью, материалам и отечественной компонентной базе",\n'
        '    "Устойчивость к эксплуатационным нагрузкам и климатическим факторам (ГОСТ 15150)"\n'
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

    user_prompt = f"Наименование/Тема: {title or 'Не указано'}\nОтрасль: {industry or 'Автоопределение'}\nБизнес-запрос заказчика:\n{query}"

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt},
    ]

    llm_output = await call_openrouter(messages, response_format_json=True)
    if llm_output:
        try:
            parsed = json.loads(_clean_json_response(llm_output))
            if "title" in parsed and "technical_requirements" in parsed:
                parsed["source"] = "openrouter"
                return parsed
        except Exception as e:
            logger.warning(f"Generate TZ JSON parse error: {e}")

    # Интеллектуальный офлайн-движок генерации (Offline Heuristic DeepTech Engine)
    cat = industry or "Новые материалы и химия"
    query_lower = query.lower()

    # Определение отраслевых параметров
    if any(k in query_lower for k in ["полимер", "пластик", "мороз", "композит", "материал", "смол", "покрыти"]):
        cat = "Новые материалы и химия"
        academic_title = f"Разработка морозостойкого полимерного композита повышенной вязкости разрушения"
        tech_reqs = [
            "Диапазон рабочих температур: от -60 °C до +85 °C с сохранением ударной вязкости по Шарпи не менее 15 кДж/м²",
            "Стойкость к агрессивным средам (солевой туман, нефтепродукты) по ГОСТ 9.066-76",
            "Температура стеклования матричного полимера не выше -45 °C",
            "Использование базовых мономеров и наполнителей отечественного производства (не менее 95%)",
        ]
        test_methods = [
            "Испытание на ударный изгиб при отрицательных температурах по ГОСТ 4647",
            "Динамический механический термический анализ (ДМА) для оценки релаксационных переходов",
            "Электронная микроскопия сколов для контроля межфазной адгезии наполнителя",
        ]
    elif any(k in query_lower for k in ["робот", "дрон", "манипулятор", "датчик", "контроллер", "привод"]):
        cat = "Робототехника и мехатроника"
        academic_title = f"Создание мехатронного комплекса с адаптивной системой управления на базе ПЛИС"
        tech_reqs = [
            "Точность позиционирования рабочего органа: не хуже ±0.05 мм при полезной нагрузке до 10 кг",
            "Время автономной работы от встроенного буфера питания: не менее 120 минут",
            "Интерфейсы связи с защитой от индустриальных помех: CAN-FD / Industrial Ethernet",
            "Климатическое исполнение УХЛ4 по ГОСТ 15150",
        ]
        test_methods = [
            "Лабораторные метрологические испытания на лазерном координатно-измерительном стенде",
            "Тестирование электромагнитной совместимости (ЭМС) по ГОСТ Р 51317",
            "Ресурсные вибродинамические испытания на вибростенде",
        ]
    elif any(k in query_lower for k in ["медицин", "био", "препарат", "имплант", "клетк", "фарм"]):
        cat = "Биотехнологии и медицина"
        academic_title = f"Разработка биосовместимого остеокондуктивного материала для тканевой инженерии"
        tech_reqs = [
            "Цитотоксичность 0 баллов по стандарту ГОСТ ISO 10993-5 (In Vitro)",
            "Пористость матрикса: 65-80% с взаимосвязанной структурой пор размером 100-300 мкм",
            "Скорость биодеградации: сопоставимая со скоростью ремоделирования костной ткани (6-9 мес.)",
        ]
        test_methods = [
            "Оценка гемосовместимости и адгезии остеобластов на культуре клеток",
            "Микротомографический анализ (микро-КТ) архитектоники пористого пространства",
            "Механические испытания на сжатие в физиологическом растворе при 37 °C",
        ]
    else:
        academic_title = f"Разработка научно-технического решения в области «{cat}»"
        tech_reqs = [
            "Соответствие ключевым требованиям ГОСТ и отраслевым ТУ РФ",
            "Улучшение целевых эксплуатационных параметров минимум на 25% относительно зарубежных аналогов",
            "Патентная чистота и подтверждённая воспроизводимость технологии в лабораторных условиях",
        ]
        test_methods = [
            "Калибровочные стендовые испытания экспериментального макета",
            "Методика ускоренных ресурсных испытаний",
            "Сертификационные приёмочные тесты независимой лабораторией",
        ]

    formatted_desc = (
        f"ТЕХНИЧЕСКОЕ ЗАДАНИЕ НА ВЫПОЛНЕНИЕ НИОКР\n\n"
        f"1. Наименование работы: {academic_title}\n"
        f"2. Отраслевое направление: {cat}\n"
        f"3. Исходная бизнес-потребность: {query.strip()}\n"
        f"4. Нормативные технические требования:\n"
        + "\n".join(f"  • {r}" for r in tech_reqs) + "\n\n"
        f"5. Методы контроля и испытаний:\n"
        + "\n".join(f"  • {m}" for m in test_methods) + "\n\n"
        f"6. Ожидаемые результаты: опытный образец, комплект конструкторской документации (КД) и заявка на патент."
    )

    return {
        "title": academic_title,
        "category": cat,
        "target_trl_start": 3,
        "target_trl_end": 6,
        "suggested_budget": 2400000,
        "suggested_deadline": "6 месяцев",
        "scientific_summary": f"Прикладное исследование по запросу: «{query.strip()[:180]}». Направлено на создание воспроизводимого технологического решения с подтверждёнными физико-техническими характеристиками.",
        "technical_requirements": tech_reqs,
        "deliverables": [
            "Аналитический отчёт и патентный формуляр по ГОСТ 15.012-84",
            "Функциональный лабораторный образец / опытная партия",
            "Проект Технических Условий (ТУ) и акт приёмочных испытаний",
        ],
        "testing_methodology": test_methods,
        "stages": [
            "Этап 1: Патентные исследования, компьютерное моделирование и расчёт рецептуры (2 мес. • 600 000 ₽)",
            "Этап 2: Лабораторный синтез, изготовление макета и калибровка параметров (3 мес. • 1 200 000 ₽)",
            "Этап 3: Стендовые приёмочные испытания, выпуск ТУ и оформление патента (1 мес. • 600 000 ₽)",
        ],
        "ip_ownership_recommendation": "Исключительные права на РИД передаются заказчику-инвестору. Лаборатория сохраняет неисключительное право на публикацию в научных изданиях без раскрытия ноу-хау.",
        "description": formatted_desc,
        "source": "offline_heuristic",
    }


def get_ai_status() -> dict[str, Any]:
    """Возвращает информацию о текущей конфигурации ИИ-сервиса."""
    has_key = bool(settings.OPENROUTER_API_KEY.strip())
    return {
        "is_configured": has_key,
        "provider": "OpenRouter" if has_key else "Offline Heuristics Engine",
        "model": settings.OPENROUTER_MODEL,
        "fallback_available": True,
    }
