import unittest
from unittest.mock import AsyncMock, MagicMock, patch
import asyncio
from fastapi import HTTPException
from fastapi.security import HTTPAuthorizationCredentials

from app.core.deps import get_current_user_flexible


class TestAuthDepsUnit(unittest.TestCase):
    """Позитивные и негативные юнит-тесты для гибкой авторизации get_current_user_flexible (Bearer и Query)."""

    def setUp(self):
        self.mock_user = MagicMock()
        self.mock_user.id = 42
        self.mock_user.is_active = True
        self.mock_user.email = "scientist@institute.ras.ru"

        self.mock_db = AsyncMock()
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = self.mock_user
        self.mock_db.execute.return_value = mock_result

    @patch("app.core.deps.decode_token")
    def test_flexible_auth_bearer_positive(self, mock_decode):
        """Позитивный тест: успешная авторизация через HTTP Bearer заголовок."""
        mock_decode.return_value = {"sub": "42", "type": "access"}
        creds = HTTPAuthorizationCredentials(scheme="Bearer", credentials="valid_jwt_token")

        user = asyncio.run(get_current_user_flexible(token=None, credentials=creds, db=self.mock_db))
        self.assertEqual(user.id, 42)
        mock_decode.assert_called_once_with("valid_jwt_token")

    @patch("app.core.deps.decode_token")
    def test_flexible_auth_query_token_positive(self, mock_decode):
        """Позитивный тест: успешная авторизация через query-параметр ?token=... (для скачивания файлов и отчетов)."""
        mock_decode.return_value = {"sub": "42", "type": "access"}

        user = asyncio.run(get_current_user_flexible(token="query_jwt_token", credentials=None, db=self.mock_db))
        self.assertEqual(user.id, 42)
        mock_decode.assert_called_once_with("query_jwt_token")

    def test_flexible_auth_missing_token_negative(self):
        """Негативный тест: выброс 401 Unauthorized при отсутствии токена."""
        with self.assertRaises(HTTPException) as ctx:
            asyncio.run(get_current_user_flexible(token=None, credentials=None, db=self.mock_db))
        self.assertEqual(ctx.exception.status_code, 401)
        self.assertIn("Необходима авторизация", ctx.exception.detail)

    @patch("app.core.deps.decode_token")
    def test_flexible_auth_invalid_token_negative(self, mock_decode):
        """Негативный тест: выброс 401 Unauthorized при невалидном или истекшем JWT токене."""
        mock_decode.return_value = None  # Не удалось декодировать

        with self.assertRaises(HTTPException) as ctx:
            asyncio.run(get_current_user_flexible(token="bad_token", credentials=None, db=self.mock_db))
        self.assertEqual(ctx.exception.status_code, 401)
        self.assertIn("Недействительный или просроченный токен", ctx.exception.detail)

    @patch("app.core.deps.decode_token")
    def test_flexible_auth_refresh_token_rejected_negative(self, mock_decode):
        """Негативный тест: отклонение refresh-токена для API запросов."""
        mock_decode.return_value = {"sub": "42", "type": "refresh"}

        with self.assertRaises(HTTPException) as ctx:
            asyncio.run(get_current_user_flexible(token="refresh_token", credentials=None, db=self.mock_db))
        self.assertEqual(ctx.exception.status_code, 401)
        self.assertIn("Недопустимый тип токена", ctx.exception.detail)

    @patch("app.core.deps.decode_token")
    def test_flexible_auth_user_not_found_negative(self, mock_decode):
        """Негативный тест: выброс 404 если пользователя с таким ID нет в БД."""
        mock_decode.return_value = {"sub": "9999", "type": "access"}
        empty_result = MagicMock()
        empty_result.scalar_one_or_none.return_value = None
        self.mock_db.execute.return_value = empty_result

        with self.assertRaises(HTTPException) as ctx:
            asyncio.run(get_current_user_flexible(token="token_with_unknown_user", credentials=None, db=self.mock_db))
        self.assertEqual(ctx.exception.status_code, 404)

    @patch("app.core.deps.decode_token")
    def test_flexible_auth_inactive_user_negative(self, mock_decode):
        """Негативный тест: выброс 403 Forbidden если пользователь заблокирован модератором."""
        mock_decode.return_value = {"sub": "42", "type": "access"}
        self.mock_user.is_active = False
        self.mock_user.moderation_comment = "Спам"

        with self.assertRaises(HTTPException) as ctx:
            asyncio.run(get_current_user_flexible(token="token_of_banned_user", credentials=None, db=self.mock_db))
        self.assertEqual(ctx.exception.status_code, 403)
        self.assertIn("заблокирован", ctx.exception.detail)


if __name__ == "__main__":
    unittest.main()
