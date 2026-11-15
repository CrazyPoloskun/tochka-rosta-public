import os
import unittest
from unittest.mock import patch, MagicMock, AsyncMock
import asyncio

from app.services.ai_service import (
    _clean_str,
    _clean_json_response,
    _extract_and_parse_json,
    _SafeHttpResponse,
    get_ai_status,
    call_real_llm,
)
from app.core.config import settings


class TestAiServiceUnit(unittest.TestCase):
    """Позитивные и негативные юнит-тесты для сервиса нейросетевой обработки (AI Service)."""

    def test_clean_str_positive(self):
        """Позитивный тест: корректная очистка строковых значений из .env."""
        self.assertEqual(_clean_str('  "google/gemini-2.5-flash"  '), "google/gemini-2.5-flash")
        self.assertEqual(_clean_str("  'sk-or-v1-abc123'  "), "sk-or-v1-abc123")
        self.assertEqual(_clean_str("simple_string"), "simple_string")

    def test_clean_str_negative(self):
        """Негативный тест: обработка None, пустых строк и нулевых значений."""
        self.assertEqual(_clean_str(None), "")
        self.assertEqual(_clean_str(""), "")
        self.assertEqual(_clean_str("   "), "")

    def test_clean_json_response_markdown(self):
        """Позитивный тест: удаление markdown code fences (```json ... ```)."""
        raw = '```json\n{"trl": 5, "title": "Новый полимер"}\n```'
        cleaned = _clean_json_response(raw)
        self.assertEqual(cleaned, '{"trl": 5, "title": "Новый полимер"}')

    def test_clean_json_response_raw_text(self):
        """Позитивный тест: извлечение JSON из окружающего текста."""
        raw = 'Вот сформированный результат анализа:\n{"title": "Биореактор", "budget": 1500000}\nНадеюсь это поможет!'
        cleaned = _clean_json_response(raw)
        self.assertIn('"title": "Биореактор"', cleaned)

    def test_extract_and_parse_json_valid(self):
        """Позитивный тест: парсинг валидного JSON объекта."""
        raw = '{"success": true, "items": [1, 2, 3]}'
        parsed = _extract_and_parse_json(raw)
        self.assertTrue(parsed["success"])
        self.assertEqual(parsed["items"], [1, 2, 3])

    def test_extract_and_parse_json_with_trailing_comma(self):
        """Позитивный тест: автоматическое исправление типичной ошибки LLM (висящие запятые)."""
        raw = '{"title": "Анализ", "stages": ["s1", "s2",], }'
        parsed = _extract_and_parse_json(raw)
        self.assertEqual(parsed["title"], "Анализ")
        self.assertEqual(parsed["stages"], ["s1", "s2"])

    def test_extract_and_parse_json_invalid_raises_negative(self):
        """Негативный тест: выброс ValueError при отсутствии JSON блока."""
        with self.assertRaises(ValueError):
            _extract_and_parse_json("Извините, я не могу ответить на этот запрос.")

    def test_get_ai_status_configured(self):
        """Позитивный тест: статус ИИ при наличии ключа OpenRouter."""
        with patch.object(settings, "OPENROUTER_API_KEY", "sk-or-v1-1234567890abcdef"):
            with patch.object(settings, "OPENROUTER_MODEL", "google/gemini-2.5-flash"):
                st = get_ai_status()
                self.assertTrue(st["is_configured"])
                self.assertEqual(st["status"], "online")
                self.assertIn("OpenRouter", st["active_provider"])
                self.assertIn("sk-or-", st["key_preview"])

    def test_get_ai_status_missing_key_negative(self):
        """Негативный тест: статус ИИ при отсутствии ключа."""
        with patch.object(settings, "OPENROUTER_API_KEY", ""):
            st = get_ai_status()
            self.assertFalse(st["is_configured"])
            self.assertEqual(st["status"], "needs_key")
            self.assertEqual(st["key_preview"], "не задан")

    def test_call_real_llm_missing_key_negative(self):
        """Негативный тест: вызов LLM без ключа выбрасывает понятную ошибку RuntimeError."""
        with patch.object(settings, "OPENROUTER_API_KEY", ""):
            with self.assertRaises(RuntimeError) as ctx:
                asyncio.run(call_real_llm([{"role": "user", "content": "test"}]))
            self.assertIn("OPENROUTER_API_KEY не задан", str(ctx.exception))

    @patch("app.services.ai_service._safe_http_post")
    def test_call_real_llm_batch_model_sanitization_positive(self, mock_post):
        """Позитивный тест: автоматическая очистка суффикса :batch и опечаток в названии модели."""
        mock_post.return_value = _SafeHttpResponse(
            status_code=200,
            text='{"choices": [{"message": {"content": "План сформирован"}}]}'
        )

        with patch.object(settings, "OPENROUTER_API_KEY", "sk-or-test-key"):
            with patch.object(settings, "OPENROUTER_MODEL", "deepseek/deepseek-v4-flash-0731:batch"):
                content, provider = asyncio.run(call_real_llm([{"role": "user", "content": "hi"}]))
                self.assertEqual(content, "План сформирован")
                # Модель должна быть исправлена на deepseek/deepseek-chat без суффикса :batch
                call_args = mock_post.call_args[1]
                payload = call_args["payload"]
                self.assertNotIn(":batch", payload["model"])
                self.assertEqual(payload["model"], "deepseek/deepseek-chat")

    @patch("app.services.ai_service._safe_http_post")
    def test_call_real_llm_404_adapter_fallback_positive(self, mock_post):
        """Позитивный тест: автовосстановление при ошибке 404 несовместимого адаптера модели."""
        # Первый вызов возвращает 404 с ошибкой адаптера, второй вызов с fallback моделью успешен
        mock_post.side_effect = [
            _SafeHttpResponse(
                status_code=404,
                text='{"error":{"message":"model cannot be used with the chat/completions endpoint (adapter DeepInfraBatchAdapter).","code":404}}'
            ),
            _SafeHttpResponse(
                status_code=200,
                text='{"choices": [{"message": {"content": "Успешный резервный ответ"}}]}'
            ),
        ]

        with patch.object(settings, "OPENROUTER_API_KEY", "sk-or-test-key"):
            with patch.object(settings, "OPENROUTER_MODEL", "some/incompatible-model"):
                content, provider = asyncio.run(call_real_llm([{"role": "user", "content": "generate"}]))
                self.assertEqual(content, "Успешный резервный ответ")
                self.assertIn("OpenRouter", provider)
                self.assertEqual(mock_post.call_count, 2)

    @patch("app.services.ai_service._safe_http_post")
    def test_call_real_llm_proxy_502_fallback_positive(self, mock_post):
        """Позитивный тест: автопереключение на прямое соединение при ошибке прокси 502/503."""
        mock_post.side_effect = [
            _SafeHttpResponse(status_code=503, text="Service Unavailable"),
            _SafeHttpResponse(status_code=200, text='{"choices": [{"message": {"content": "Прямой ответ"}}]}'),
        ]

        with patch.object(settings, "OPENROUTER_API_KEY", "sk-or-test-key"):
            with patch.object(settings, "OPENROUTER_PROXY", "http://gluetun:8888"):
                content, _ = asyncio.run(call_real_llm([{"role": "user", "content": "ping"}]))
                self.assertEqual(content, "Прямой ответ")
                # Второй вызов должен был пойти с proxy=None (напрямую)
                self.assertIsNone(mock_post.call_args_list[1][1]["proxy"])


if __name__ == "__main__":
    unittest.main()
