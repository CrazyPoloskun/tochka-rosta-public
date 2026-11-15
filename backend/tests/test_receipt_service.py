import unittest
from decimal import Decimal
from datetime import datetime

from app.services.receipt_service import generate_receipt_pdf


class TestReceiptServiceUnit(unittest.TestCase):
    """Позитивные и негативные юнит-тесты для сервиса формирования банковских чеков и квитанций."""

    def test_generate_receipt_pdf_positive(self):
        """Позитивный тест: генерация официального платёжного чека в PDF."""
        pdf_bytes = generate_receipt_pdf(
            tx_id=1054,
            amount=Decimal("250000.00"),
            operation_label="Пополнение эскроу-счёта по проекту №12",
            payer_name="ООО «Инновационные Технологии»",
            payer_inn="7704217370",
            recipient_name="ФГБУН Институт биоорганической химии РАН",
            recipient_inn="7728168971",
            purpose="Оплата 1-го этапа НИОКР «Синтез полипептидов»",
            created_at=datetime(2026, 11, 15, 14, 30, 0),
        )

        self.assertIsInstance(pdf_bytes, bytes)
        self.assertGreater(len(pdf_bytes), 1000)
        # Проверка сигнатуры PDF
        self.assertTrue(pdf_bytes.startswith(b"%PDF-"))

    def test_generate_receipt_pdf_zero_and_float_amount(self):
        """Позитивный тест: генерация чека с float и нулевыми суммами."""
        pdf_bytes = generate_receipt_pdf(
            tx_id=999,
            amount=0.0,
            operation_label="Тестовая транзакция",
            payer_name="ИП Иванов",
            payer_inn="770123456789",
            recipient_name="Платформа «Точка Роста»",
            recipient_inn="7700000000",
            purpose="Безвозмездное пожертвование",
            created_at=datetime.utcnow(),
        )

        self.assertIsInstance(pdf_bytes, bytes)
        self.assertTrue(pdf_bytes.startswith(b"%PDF-"))

    def test_generate_receipt_pdf_empty_strings_negative(self):
        """Негативный тест: обработка пустых строк в реквизитах сторон."""
        pdf_bytes = generate_receipt_pdf(
            tx_id=1,
            amount=Decimal("1000.00"),
            operation_label="",
            payer_name="",
            payer_inn="",
            recipient_name="",
            recipient_inn="",
            purpose="",
            created_at=datetime.utcnow(),
        )

        self.assertIsInstance(pdf_bytes, bytes)
        self.assertTrue(pdf_bytes.startswith(b"%PDF-"))


if __name__ == "__main__":
    unittest.main()
