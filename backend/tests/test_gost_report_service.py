import os
import unittest
import tempfile
from docx import Document
from reportlab.pdfgen import canvas

from app.services.gost_report_service import (
    build_gost_docx,
    build_gost_pdf,
    draw_fitted_string,
    draw_centered_wrapped,
)


class TestGostReportServiceUnit(unittest.TestCase):
    """Позитивные и негативные юнит-тесты для генератора научных отчётов по ГОСТ 7.32 (DOCX и PDF)."""

    def setUp(self):
        self.temp_dir = tempfile.mkdtemp()
        self.docx_path = os.path.join(self.temp_dir, "test_report.docx")
        self.pdf_path = os.path.join(self.temp_dir, "test_report.pdf")

    def tearDown(self):
        import shutil
        if os.path.exists(self.temp_dir):
            shutil.rmtree(self.temp_dir, ignore_errors=True)

    def test_build_gost_docx_structure_positive(self):
        """Позитивный тест: первая страница содержит форму, а остальные — только текст автора."""
        author_text = (
            "Синтезированы полимерные композиты с добавлением нанотрубок.\n\n"
            "Проведены испытания на растяжение и изгиб по ГОСТ 11262-2017.\n"
            "Экспериментальные образцы выдержали нагрузку 140 МПа."
        )

        build_gost_docx(
            output_path=self.docx_path,
            project_title="Разработка сверхпрочных полимеров",
            milestone_step=1,
            milestone_title="Синтез образцов",
            lab_org_name="НИИ Материаловедения РАН",
            lab_rep_name="Иванов И.И.",
            investor_org_name="ООО «ПромТех»",
            investor_rep_name="Петров П.П.",
            main_research_text=author_text,
        )

        self.assertTrue(os.path.exists(self.docx_path))
        self.assertGreater(os.path.getsize(self.docx_path), 5000)

        # Проверка содержимого сгенерированного DOCX документа
        doc = Document(self.docx_path)
        all_text = "\n".join(p.text for p in doc.paragraphs)

        # 1-я страница (форма): содержит ключевые атрибуты
        self.assertIn("МИНИСТЕРСТВО НАУКИ И ВЫСШЕГО ОБРАЗОВАНИЯ", all_text)
        self.assertIn("НИИ МАТЕРИАЛОВЕДЕНИЯ РАН", all_text)
        self.assertIn("УТВЕРЖДАЮ", all_text)
        self.assertIn("ОТЧЕТ", all_text)
        self.assertIn("О НАУЧНО-ИССЛЕДОВАТЕЛЬСКОЙ РАБОТЕ", all_text)
        self.assertIn("Разработка сверхпрочных полимеров", all_text)
        self.assertIn("Москва — 2026", all_text)

        # 2-я страница (текст автора): содержит исходный текст без синтетических псевдо-разделов
        self.assertIn("Синтезированы полимерные композиты", all_text)
        self.assertIn("140 МПа", all_text)
        self.assertNotIn("СПИСОК ИСПОЛНИТЕЛЕЙ", all_text)
        self.assertNotIn("РЕФЕРАТ", all_text)

    def test_build_gost_docx_empty_author_text_negative(self):
        """Негативный тест: обработка пустого текста отчёта."""
        build_gost_docx(
            output_path=self.docx_path,
            project_title="Тестовый проект",
            milestone_step=1,
            milestone_title="Этап 1",
            lab_org_name="НИИ",
            lab_rep_name="Руководитель",
            investor_org_name="Инвестор",
            investor_rep_name="Заказчик",
            main_research_text="",
        )

        doc = Document(self.docx_path)
        all_text = "\n".join(p.text for p in doc.paragraphs)
        self.assertIn("Текст отчета не предоставлен", all_text)

    def test_build_gost_pdf_structure_positive(self):
        """Позитивный тест: генерация валидного PDF с титульным листом и текстом автора."""
        author_text = (
            "Проведено квантово-химическое моделирование параметров кристаллической решетки.\n"
            "Погрешность расчетной модели относительно эксперимента составила менее 3.5%.\n"
            "Разработана методика стендовых испытаний."
        )

        build_gost_pdf(
            output_path=self.pdf_path,
            project_title="Квантовые сенсоры",
            milestone_step=2,
            milestone_title="Компьютерное моделирование",
            lab_org_name="ФТИ им. Иоффе",
            lab_rep_name="Смирнов А.В.",
            investor_org_name="АО «РосЭлектроника»",
            investor_rep_name="Сидоров С.С.",
            main_research_text=author_text,
        )

        self.assertTrue(os.path.exists(self.pdf_path))
        size = os.path.getsize(self.pdf_path)
        self.assertGreater(size, 2000)

        # Проверка валидности PDF (заголовок %PDF)
        with open(self.pdf_path, "rb") as f:
            header = f.read(5)
            self.assertEqual(header, b"%PDF-")

    def test_build_gost_pdf_multipage_pagination(self):
        """Позитивный тест: многостраничный отчёт корректно переносит текст на страницы 2, 3 и т.д."""
        long_paragraph = "Длинный научный абзац с подробным описанием методики проведения испытаний, погрешностей датчиков и результатов стендовой калибровки. " * 30
        long_text = "\n\n".join([long_paragraph] * 8)

        build_gost_pdf(
            output_path=self.pdf_path,
            project_title="Объемный отчет",
            milestone_step=1,
            milestone_title="Комплексные испытания",
            lab_org_name="Институт Проблем Управления",
            lab_rep_name="Петров",
            investor_org_name="Заказчик",
            investor_rep_name="Директор",
            main_research_text=long_text,
        )

        self.assertTrue(os.path.exists(self.pdf_path))
        self.assertGreater(os.path.getsize(self.pdf_path), 5000)

    def test_draw_fitted_string_truncation_positive(self):
        """Позитивный тест: функция draw_fitted_string безопасно обрезает слишком длинные строки."""
        c = canvas.Canvas(self.pdf_path)
        # Отрисовка строки, которая точно не поместится в 50 пунктов
        draw_fitted_string(c, "Очень длинное наименование организации с множеством подразделений", 10, 10, max_w=50, font_name="Helvetica", font_size=10)
        c.showPage()
        c.save()
        self.assertTrue(os.path.exists(self.pdf_path))

    def test_draw_fitted_string_empty_negative(self):
        """Негативный тест: обработка пустого текста или None."""
        c = canvas.Canvas(self.pdf_path)
        draw_fitted_string(c, "", 10, 10, 100, "Helvetica", 10)
        draw_fitted_string(c, None, 10, 10, 100, "Helvetica", 10)
        c.showPage()
        c.save()
        self.assertTrue(os.path.exists(self.pdf_path))


if __name__ == "__main__":
    unittest.main()
