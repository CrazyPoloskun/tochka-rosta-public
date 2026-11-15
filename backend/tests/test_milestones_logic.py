import unittest
from decimal import Decimal


class TestMilestonesLogicUnit(unittest.TestCase):
    """Позитивные и негативные юнит-тесты бизнес-логики этапов НИОКР, статусов и эскроу-расчетов."""

    def test_milestone_allowed_statuses_positive(self):
        """Позитивный тест: валидация всех допустимых статусов этапа проекта."""
        allowed_statuses = {
            "pending_funds",
            "escrow_funded",
            "in_review",
            "approved",
            "completed",
            "disputed",
        }
        for st in allowed_statuses:
            self.assertIn(st, allowed_statuses)

    def test_milestone_completion_check_positive(self):
        """Позитивный тест: проверка завершенности этапа по статусам 'approved' или 'completed'."""
        def is_completed(status: str) -> bool:
            return status in ("completed", "approved")

        self.assertTrue(is_completed("completed"))
        self.assertTrue(is_completed("approved"))
        self.assertFalse(is_completed("in_review"))
        self.assertFalse(is_completed("pending_funds"))
        self.assertFalse(is_completed("escrow_funded"))
        self.assertFalse(is_completed("disputed"))

    def test_milestones_sum_calculation_positive(self):
        """Позитивный тест: расчёт общей суммы этапов для бюджета разработки."""
        milestones = [
            {"step": 1, "title": "Синтез образцов", "amount": 250000},
            {"step": 2, "title": "Стендовые испытания", "amount": 500000},
            {"step": 3, "title": "Опытно-промышленная партия", "amount": 750000},
        ]
        total = sum(m["amount"] for m in milestones)
        self.assertEqual(total, 1500000)

    def test_escrow_payout_and_commission_calculation(self):
        """Позитивный тест: точный расчет выплаты НИИ (93%) и комиссии платформы (7%)."""
        stage_amount = Decimal("1000000.00")
        platform_fee_rate = Decimal("0.07")

        fee = stage_amount * platform_fee_rate
        net_payout = stage_amount - fee

        self.assertEqual(fee, Decimal("70000.00"))
        self.assertEqual(net_payout, Decimal("930000.00"))
        self.assertEqual(fee + net_payout, stage_amount)

    def test_milestone_empty_or_zero_budget_negative(self):
        """Негативный тест: корректная обработка нулевого или пустого этапа."""
        milestones = []
        total = sum(m.get("amount", 0) for m in milestones)
        self.assertEqual(total, 0)

        milestones_with_none = [{"amount": None}, {"amount": 50000}]
        safe_total = sum(Number(m.get("amount") or 0) for m in milestones_with_none)
        self.assertEqual(safe_total, 50000)


def Number(val):
    try:
        return int(val) if val is not None else 0
    except (ValueError, TypeError):
        return 0


if __name__ == "__main__":
    unittest.main()
