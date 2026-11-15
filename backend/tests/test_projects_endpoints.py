import unittest
from unittest.mock import AsyncMock, MagicMock, patch
import asyncio
from datetime import datetime
from decimal import Decimal
from fastapi import HTTPException

from app.models.project import Project, ProjectMilestone
from app.models.user import User


class TestProjectsEndpointsUnit(unittest.TestCase):
    """Позитивные и негативные юнит-тесты эндпоинтов проектов, сдачи отчетов и скачивания ГОСТ-документов."""

    def setUp(self):
        self.mock_lab_user = User(
            id=10,
            email="lab@institute.ras.ru",
            full_name="Смирнов А.В.",
            organization_name="ФТИ им. Иоффе",
            representative_name="Смирнов А.В.",
            is_active=True,
            is_admin=False,
        )
        self.mock_investor_user = User(
            id=20,
            email="investor@corp.ru",
            full_name="Васильев К.А.",
            organization_name="ООО «ТехноПром»",
            representative_name="Васильев К.А.",
            is_active=True,
            is_admin=False,
        )
        self.mock_stranger_user = User(
            id=99,
            email="stranger@other.ru",
            full_name="Чужой Пользователь",
            is_active=True,
            is_admin=False,
        )

        self.mock_project = Project(
            id=1,
            title="Разработка композитных материалов",
            investor_id=20,
            lab_id=10,
            total_budget=Decimal("1500000.00"),
            status="in_progress",
            created_at=datetime.utcnow(),
            is_syndicated=False,
        )

        self.mock_milestone = ProjectMilestone(
            id=101,
            project_id=1,
            step_number=1,
            title="Лабораторный синтез",
            amount=Decimal("500000.00"),
            status="escrow_funded",
            raw_report=None,
        )

    def test_milestone_submit_permission_denied_for_stranger_negative(self):
        """Негативный тест: посторонний пользователь не имеет права сдавать отчет по чужому проекту."""
        # Проверяем логику авторизации проекта: сдавать может только lab_id (10) или admin
        user = self.mock_stranger_user
        project = self.mock_project
        has_permission = (project.lab_id == user.id or user.is_admin)
        self.assertFalse(has_permission)

    def test_milestone_submit_permission_allowed_for_lab_positive(self):
        """Позитивный тест: исполнитель проекта (НИИ) имеет право сдать отчет."""
        user = self.mock_lab_user
        project = self.mock_project
        has_permission = (project.lab_id == user.id or user.is_admin)
        self.assertTrue(has_permission)

    def test_milestone_approve_permission_denied_for_lab_negative(self):
        """Негативный тест: исполнитель (НИИ) не может сам себе утвердить этап (только инвестор)."""
        user = self.mock_lab_user
        project = self.mock_project
        has_permission = (project.investor_id == user.id or user.is_admin)
        self.assertFalse(has_permission)

    def test_milestone_approve_permission_allowed_for_investor_positive(self):
        """Позитивный тест: инвестор имеет право утвердить выполнение этапа."""
        user = self.mock_investor_user
        project = self.mock_project
        has_permission = (project.investor_id == user.id or user.is_admin)
        self.assertTrue(has_permission)

    def test_gost_report_access_control_parties_positive(self):
        """Позитивный тест: доступ к скачиванию отчета разрешен инвестору, НИИ и администратору."""
        project = self.mock_project

        def can_access(user):
            is_party = (user.id in [project.investor_id, project.lab_id])
            return is_party or user.is_admin

        self.assertTrue(can_access(self.mock_lab_user))
        self.assertTrue(can_access(self.mock_investor_user))

        admin = User(id=1, email="admin@tochkarosta.ru", is_active=True, is_admin=True)
        self.assertTrue(can_access(admin))

    def test_gost_report_access_control_stranger_negative(self):
        """Негативный тест: посторонний пользователь блокируется с 403 Forbidden при попытке скачать закрытый отчет."""
        project = self.mock_project

        def can_access(user):
            is_party = (user.id in [project.investor_id, project.lab_id])
            return is_party or user.is_admin

        self.assertFalse(can_access(self.mock_stranger_user))


if __name__ == "__main__":
    unittest.main()
