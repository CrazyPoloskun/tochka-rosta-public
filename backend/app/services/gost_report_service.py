import os
from datetime import datetime
from docx import Document
from docx.shared import Pt, Mm, Inches, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import nsdecls, qn

from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics

UPLOAD_DIR = os.environ.get("UPLOAD_DIR", "uploads")


def set_cell_margins(cell, top=100, bottom=100, left=150, right=150):
    tcPr = cell._tc.get_or_add_tcPr()
    tcMar = OxmlElement('w:tcMar')
    for m, val in [('top', top), ('bottom', bottom), ('left', left), ('right', right)]:
        node = OxmlElement(f'w:{m}')
        node.set(qn('w:w'), str(val))
        node.set(qn('w:type'), 'dxa')
        tcMar.append(node)
    tcPr.append(tcMar)


def build_gost_docx(
    output_path: str,
    project_title: str,
    milestone_step: int,
    milestone_title: str,
    lab_org_name: str,
    lab_rep_name: str,
    investor_org_name: str,
    investor_rep_name: str,
    executors: list[dict],
    abstract_text: str,
    intro_text: str,
    main_research_text: str,
    conclusion_text: str,
    references: list[str],
) -> str:
    """
    Генерирует официальный документ DOCX в строгом соответствии с ГОСТ 7.32-2017:
    - Поля: левое 30 мм, правое 15 мм, верхнее 20 мм, нижнее 20 мм.
    - Шрифт: Times New Roman 14 pt, полуторный интервал (1.5 line spacing).
    - Абзацный отступ (красная строка): 1.25 см.
    - Выравнивание основного текста по ширине.
    """
    dir_p = os.path.dirname(output_path)
    if dir_p:
        os.makedirs(dir_p, exist_ok=True)
    doc = Document()

    # Настройка полей ГОСТ 7.32-2017
    for section in doc.sections:
        section.top_margin = Mm(20)
        section.bottom_margin = Mm(20)
        section.left_margin = Mm(30)
        section.right_margin = Mm(15)

    # Базовый стиль
    normal_style = doc.styles['Normal']
    normal_style.font.name = 'Times New Roman'
    normal_style.font.size = Pt(14)
    normal_style.font.color.rgb = RGBColor(0, 0, 0)

    def add_p(text="", align=WD_ALIGN_PARAGRAPH.JUSTIFY, bold=False, italic=False, space_after=6, line_spacing=1.5, indent=True):
        p = doc.add_paragraph()
        p.alignment = align
        p.paragraph_format.space_after = Pt(space_after)
        p.paragraph_format.line_spacing = line_spacing
        if indent and align == WD_ALIGN_PARAGRAPH.JUSTIFY:
            p.paragraph_format.first_line_indent = Mm(12.5)  # 1.25 см красная строка
        run = p.add_run(text)
        run.bold = bold
        run.italic = italic
        run.font.name = 'Times New Roman'
        run.font.size = Pt(14)
        return p

    def add_heading_gost(title: str):
        p = doc.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p.paragraph_format.space_before = Pt(18)
        p.paragraph_format.space_after = Pt(12)
        p.paragraph_format.line_spacing = 1.5
        run = p.add_run(title.upper())
        run.bold = True
        run.font.name = 'Times New Roman'
        run.font.size = Pt(14)
        return p

    # ================== ТИТУЛЬНЫЙ ЛИСТ ==================
    add_p("МИНИСТЕРСТВО НАУКИ И ВЫСШЕГО ОБРАЗОВАНИЯ РОССИЙСКОЙ ФЕДЕРАЦИИ", align=WD_ALIGN_PARAGRAPH.CENTER, bold=True, space_after=3, indent=False)
    add_p(lab_org_name.upper(), align=WD_ALIGN_PARAGRAPH.CENTER, bold=True, space_after=24, indent=False)

    # Блок согласования (справа)
    p_appr = doc.add_paragraph()
    p_appr.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    p_appr.paragraph_format.line_spacing = 1.15
    p_appr.paragraph_format.space_after = Pt(36)
    r1 = p_appr.add_run("УТВЕРЖДАЮ\nРуководитель организации\n")
    r1.bold = True
    r1.font.name = 'Times New Roman'
    p_appr.add_run(f"_________________ / {lab_rep_name or 'Руководитель НИИ'} /\n«___» ____________ 2026 г.")

    # Заголовок отчета
    add_p("ОТЧЕТ", align=WD_ALIGN_PARAGRAPH.CENTER, bold=True, space_after=4, indent=False)
    add_p("О НАУЧНО-ИССЛЕДОВАТЕЛЬСКОЙ РАБОТЕ", align=WD_ALIGN_PARAGRAPH.CENTER, bold=True, space_after=18, indent=False)

    add_p(f"по теме проекта: «{project_title}»", align=WD_ALIGN_PARAGRAPH.CENTER, bold=True, space_after=12, indent=False)
    add_p(f"(промежуточный отчет по этапу № {milestone_step}: «{milestone_title}»)", align=WD_ALIGN_PARAGRAPH.CENTER, italic=True, space_after=36, indent=False)

    # Заказчик и исполнитель
    p_meta = doc.add_paragraph()
    p_meta.alignment = WD_ALIGN_PARAGRAPH.LEFT
    p_meta.paragraph_format.line_spacing = 1.3
    p_meta.paragraph_format.space_after = Pt(60)
    p_meta.paragraph_format.first_line_indent = Mm(12.5)
    p_meta.add_run("Заказчик разработки: ").bold = True
    p_meta.add_run(f"{investor_org_name or investor_rep_name}\n")
    p_meta.add_run("Головной исполнитель: ").bold = True
    p_meta.add_run(f"{lab_org_name}\n")
    p_meta.add_run("Научный руководитель: ").bold = True
    p_meta.add_run(f"{lab_rep_name or 'Ведущий научный сотрудник'}\n")

    # Город и год
    add_p("Москва — 2026", align=WD_ALIGN_PARAGRAPH.CENTER, space_after=0, indent=False)
    doc.add_page_break()

    # ================== СПИСОК ИСПОЛНИТЕЛЕЙ ==================
    add_heading_gost("СПИСОК ИСПОЛНИТЕЛЕЙ")
    if executors:
        for ex in executors:
            name = ex.get("name", "Исполнитель")
            role = ex.get("role", "Научный сотрудник")
            degree = ex.get("degree", "")
            deg_str = f", {degree}" if degree else ""
            add_p(f"• {name} — {role}{deg_str}", indent=True, space_after=4)
    else:
        add_p(f"• {lab_rep_name or 'Руководитель лаборатории'} — руководитель работ, сбор и анализ результатов.", indent=True)
        add_p("• Коллектив научного подразделения организации-исполнителя.", indent=True)

    # ================== РЕФЕРАТ ==================
    add_heading_gost("РЕФЕРАТ")
    add_p(abstract_text if abstract_text else f"Отчет содержит результаты выполнения этапа №{milestone_step} «{milestone_title}» по проекту «{project_title}». Проведен комплекс теоретических и прикладных исследований, получены экспериментальные данные, подтверждающие заявленные технические параметры.", indent=True)

    # ================== ВВЕДЕНИЕ ==================
    add_heading_gost("ВВЕДЕНИЕ")
    add_p(intro_text if intro_text else f"Целью этапа является разработка и валидация научно-технических решений в соответствии с требованиями технического задания на проведение НИОКР «{project_title}». Актуальность работы обусловлена необходимостью импортозамещения и технологического суверенитета в заявленной отрасли.", indent=True)

    # ================== 1. ОСНОВНАЯ ЧАСТЬ ==================
    add_heading_gost("1. ОСНОВНЫЕ РЕЗУЛЬТАТЫ И НАУЧНО-ТЕХНИЧЕСКАЯ ЧАСТЬ")
    paragraphs = main_research_text.split("\n\n") if "\n\n" in main_research_text else [main_research_text]
    for p_text in paragraphs:
        if p_text.strip():
            add_p(p_text.strip(), indent=True)

    # ================== ЗАКЛЮЧЕНИЕ ==================
    add_heading_gost("ЗАКЛЮЧЕНИЕ")
    add_p(conclusion_text if conclusion_text else f"В ходе выполнения этапа №{milestone_step} научно-технические задачи решены в полном объеме. Полученные параметры соответствуют Техническому заданию. Рекомендуется переход к следующему этапу реализации проекта.", indent=True)

    # ================== СПИСОК ИСПОЛЬЗОВАННЫХ ИСТОЧНИКОВ ==================
    add_heading_gost("СПИСОК ИСПОЛЬЗОВАННЫХ ИСТОЧНИКОВ")
    if references:
        for idx, ref in enumerate(references, 1):
            add_p(f"{idx}. {ref}", indent=True, space_after=4)
    else:
        add_p("1. ГОСТ 7.32-2017. Система стандартов по информации, библиотечному и издательскому делу. Отчет о научно-исследовательской работе. Структура и правила оформления.", indent=True, space_after=4)
        add_p("2. Гражданский кодекс Российской Федерации. Часть 4. Права на результаты интеллектуальной деятельности и средства индивидуализации.", indent=True, space_after=4)

    doc.save(output_path)
    return output_path


def build_gost_pdf(
    output_path: str,
    project_title: str,
    milestone_step: int,
    milestone_title: str,
    lab_org_name: str,
    lab_rep_name: str,
    investor_org_name: str,
    investor_rep_name: str,
    executors: list[dict],
    abstract_text: str,
    intro_text: str,
    main_research_text: str,
    conclusion_text: str,
    references: list[str],
) -> str:
    """
    Генерирует PDF версию отчета по ГОСТ 7.32 средствами ReportLab.
    """
    dir_p = os.path.dirname(output_path)
    if dir_p:
        os.makedirs(dir_p, exist_ok=True)
    c = canvas.Canvas(output_path, pagesize=A4)
    width, height = A4

    font_reg = "CustomArial" if "CustomArial" in pdfmetrics.getRegisteredFontNames() else "Helvetica"
    font_bold = "CustomArialBold" if "CustomArialBold" in pdfmetrics.getRegisteredFontNames() else "Helvetica-Bold"

    # Страница 1: Титульный лист
    margin_left = 85  # ~30mm
    margin_right = 42 # ~15mm
    content_width = width - margin_left - margin_right

    y = height - 57 # ~20mm
    c.setFont(font_bold, 10.5)
    c.drawCentredString(width / 2, y, "МИНИСТЕРСТВО НАУКИ И ВЫСШЕГО ОБРАЗОВАНИЯ РОССИЙСКОЙ ФЕДЕРАЦИИ")
    y -= 16
    c.drawCentredString(width / 2, y, lab_org_name.upper()[:60])

    y -= 50
    # УТВЕРЖДАЮ
    c.setFont(font_bold, 10.5)
    c.drawRightString(width - margin_right, y, "УТВЕРЖДАЮ")
    y -= 14
    c.setFont(font_reg, 9.5)
    c.drawRightString(width - margin_right, y, "Руководитель организации")
    y -= 14
    c.drawRightString(width - margin_right, y, f"___________ / {lab_rep_name or 'Руководитель НИИ'} /")
    y -= 14
    c.drawRightString(width - margin_right, y, "«___» ____________ 2026 г.")

    y -= 70
    c.setFont(font_bold, 16)
    c.drawCentredString(width / 2, y, "ОТЧЕТ")
    y -= 20
    c.setFont(font_bold, 13)
    c.drawCentredString(width / 2, y, "О НАУЧНО-ИССЛЕДОВАТЕЛЬСКОЙ РАБОТЕ")

    y -= 30
    c.setFont(font_bold, 11)
    c.drawCentredString(width / 2, y, f"по проекту: «{project_title[:60]}»")
    y -= 18
    c.setFont(font_reg, 10)
    c.drawCentredString(width / 2, y, f"(промежуточный отчет по этапу №{milestone_step}: «{milestone_title[:50]}»)")

    y -= 90
    c.setFont(font_bold, 10)
    c.drawString(margin_left, y, "Заказчик разработки:")
    c.setFont(font_reg, 10)
    c.drawString(margin_left + 140, y, investor_org_name or investor_rep_name)
    y -= 20
    c.setFont(font_bold, 10)
    c.drawString(margin_left, y, "Головной исполнитель:")
    c.setFont(font_reg, 10)
    c.drawString(margin_left + 140, y, lab_org_name)
    y -= 20
    c.setFont(font_bold, 10)
    c.drawString(margin_left, y, "Научный руководитель:")
    c.setFont(font_reg, 10)
    c.drawString(margin_left + 140, y, lab_rep_name or "Ведущий научный сотрудник")

    # Внизу
    c.setFont(font_reg, 10)
    c.drawCentredString(width / 2, 57, "Москва — 2026")
    c.showPage()

    # Страница 2: Содержание и разделы
    def render_section(heading: str, body: str, page_num: int):
        cur_y = height - 57
        c.setFont(font_bold, 12)
        c.drawCentredString(width / 2, cur_y, heading)
        cur_y -= 28

        c.setFont(font_reg, 10.5)
        text_obj = c.beginText(margin_left, cur_y)
        text_obj.setFont(font_reg, 10.5)
        text_obj.setLeading(15)

        for line_raw in body.split("\n"):
            words = line_raw.split()
            cur_line = "    " # отступ красной строки
            for w in words:
                if c.stringWidth(cur_line + " " + w, font_reg, 10.5) < content_width:
                    cur_line = cur_line + (" " if cur_line.strip() else "") + w
                else:
                    text_obj.textLine(cur_line)
                    cur_line = w
            if cur_line.strip():
                text_obj.textLine(cur_line)

        c.drawText(text_obj)
        # Номер страницы
        c.setFont(font_reg, 9)
        c.drawCentredString(width / 2, 40, str(page_num))
        c.showPage()

    # Секция ВВЕДЕНИЕ
    render_section("ВВЕДЕНИЕ", intro_text, 2)
    # Секция ОСНОВНАЯ ЧАСТЬ
    render_section("1. ОСНОВНЫЕ РЕЗУЛЬТАТЫ ИССЛЕДОВАНИЙ", main_research_text, 3)
    # Секция ЗАКЛЮЧЕНИЕ
    render_section("ЗАКЛЮЧЕНИЕ", conclusion_text, 4)

    c.save()
    return output_path
