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
from reportlab.pdfbase.ttfonts import TTFont

UPLOAD_DIR = os.environ.get("UPLOAD_DIR", "uploads")

# Регистрация шрифтов с поддержкой кириллицы
FONT_DIR = os.path.join(os.path.dirname(__file__), "..", "assets", "fonts")
try:
    times_path = os.path.join(FONT_DIR, "times.ttf")
    timesbd_path = os.path.join(FONT_DIR, "timesbd.ttf")
    arial_path = os.path.join(FONT_DIR, "arial.ttf")
    arialbd_path = os.path.join(FONT_DIR, "arialbd.ttf")

    if os.path.exists(times_path) and "CustomTimes" not in pdfmetrics.getRegisteredFontNames():
        pdfmetrics.registerFont(TTFont("CustomTimes", times_path))
    if os.path.exists(timesbd_path) and "CustomTimesBold" not in pdfmetrics.getRegisteredFontNames():
        pdfmetrics.registerFont(TTFont("CustomTimesBold", timesbd_path))
    if os.path.exists(arial_path) and "CustomArial" not in pdfmetrics.getRegisteredFontNames():
        pdfmetrics.registerFont(TTFont("CustomArial", arial_path))
    if os.path.exists(arialbd_path) and "CustomArialBold" not in pdfmetrics.getRegisteredFontNames():
        pdfmetrics.registerFont(TTFont("CustomArialBold", arialbd_path))
except Exception as e:
    print(f"[GOST REPORT] Font registration error: {e}")


def draw_fitted_string(c, text: str, x: float, y: float, max_w: float, font_name: str, font_size: float, fill_color=colors.black):
    """Отрисовывает строку, гарантируя, что она не выйдет за пределы max_w."""
    if not text:
        return
    text = str(text).strip()
    c.setFont(font_name, font_size)
    c.setFillColor(fill_color)
    if c.stringWidth(text, font_name, font_size) <= max_w:
        c.drawString(x, y, text)
        return

    truncated = text
    while truncated and c.stringWidth(truncated + "...", font_name, font_size) > max_w:
        truncated = truncated[:-1].strip()
    c.drawString(x, y, (truncated + "...") if truncated else text[:25])


def draw_centered_wrapped(c, text: str, center_x: float, y_start: float, max_w: float, font_name: str, font_size: float, line_spacing: float, max_lines: int = 3, fill_color=colors.black) -> float:
    """Отрисовывает отцентрированный текст с переносом по словам в пределах max_w."""
    if not text:
        return y_start
    c.setFont(font_name, font_size)
    c.setFillColor(fill_color)
    words = str(text).strip().split()
    lines = []
    cur = ""
    for w in words:
        test = (cur + " " + w) if cur else w
        if c.stringWidth(test, font_name, font_size) <= max_w:
            cur = test
        else:
            if cur:
                lines.append(cur)
            cur = w
        if len(lines) >= max_lines - 1:
            break
    if cur:
        lines.append(cur)

    cur_y = y_start
    for idx, line in enumerate(lines[:max_lines]):
        if c.stringWidth(line, font_name, font_size) > max_w:
            while line and c.stringWidth(line + "...", font_name, font_size) > max_w:
                line = line[:-1].strip()
            line += "..."
        c.drawCentredString(center_x, cur_y, line)
        cur_y -= line_spacing
    return cur_y


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

    # Официальный графический логотип платформы
    logo_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "assets", "logo.png")
    if os.path.exists(logo_path):
        try:
            p_logo = doc.add_paragraph()
            p_logo.alignment = WD_ALIGN_PARAGRAPH.CENTER
            p_logo.paragraph_format.space_after = Pt(10)
            run_logo = p_logo.add_run()
            run_logo.add_picture(logo_path, width=Inches(2.2))
        except Exception:
            pass

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
    Гарантирует отсутствие переполнения (overflow) за границы страницы
    и корректную многостраничную пагинацию.
    """
    dir_p = os.path.dirname(output_path)
    if dir_p:
        os.makedirs(dir_p, exist_ok=True)
    c = canvas.Canvas(output_path, pagesize=A4)
    width, height = A4

    # Выбор шрифта (ГОСТ рекомендует Times New Roman)
    if "CustomTimes" in pdfmetrics.getRegisteredFontNames():
        font_reg = "CustomTimes"
        font_bold = "CustomTimesBold"
    elif "CustomArial" in pdfmetrics.getRegisteredFontNames():
        font_reg = "CustomArial"
        font_bold = "CustomArialBold"
    else:
        font_reg = "Helvetica"
        font_bold = "Helvetica-Bold"

    # Страница 1: Титульный лист
    margin_left = 85  # ~30mm
    margin_right = 42 # ~15mm
    content_width = width - margin_left - margin_right

    # Официальный графический логотип платформы в шапке отчета
    logo_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "assets", "logo.png")
    if os.path.exists(logo_path):
        try:
            logo_h = 18
            logo_w = logo_h * (1287.0 / 356.0)
            c.drawImage(logo_path, (width - logo_w) / 2, height - 42, width=logo_w, height=logo_h, mask="auto")
        except Exception:
            pass

    y = height - 57 # ~20mm
    c.setFont(font_bold, 10)
    c.setFillColor(colors.black)
    c.drawCentredString(width / 2, y, "МИНИСТЕРСТВО НАУКИ И ВЫСШЕГО ОБРАЗОВАНИЯ РОССИЙСКОЙ ФЕДЕРАЦИИ")
    y -= 16

    y = draw_centered_wrapped(c, (lab_org_name or "НАУЧНАЯ ОРГАНИЗАЦИЯ").upper(), width / 2, y, content_width, font_bold, 10, 14, max_lines=2)

    y -= 25
    # УТВЕРЖДАЮ
    c.setFont(font_bold, 10)
    c.drawRightString(width - margin_right, y, "УТВЕРЖДАЮ")
    y -= 14
    c.setFont(font_reg, 9.5)
    c.drawRightString(width - margin_right, y, "Руководитель организации")
    y -= 14
    rep_label = f"___________ / {lab_rep_name or 'Руководитель НИИ'} /"
    if c.stringWidth(rep_label, font_reg, 9.5) > content_width / 2:
        rep_label = f"___________ / {(lab_rep_name or '')[:25]}... /"
    c.drawRightString(width - margin_right, y, rep_label)
    y -= 14
    c.drawRightString(width - margin_right, y, "«___» ____________ 2026 г.")

    y -= 45
    c.setFont(font_bold, 16)
    c.drawCentredString(width / 2, y, "ОТЧЕТ")
    y -= 20
    c.setFont(font_bold, 13)
    c.drawCentredString(width / 2, y, "О НАУЧНО-ИССЛЕДОВАТЕЛЬСКОЙ РАБОТЕ")

    y -= 25
    y = draw_centered_wrapped(c, f"по проекту: «{project_title}»", width / 2, y, content_width, font_bold, 11, 15, max_lines=2)
    y -= 6
    y = draw_centered_wrapped(c, f"(промежуточный отчет по этапу №{milestone_step}: «{milestone_title}»)", width / 2, y, content_width, font_reg, 9.5, 13, max_lines=2)

    y -= 35
    def draw_meta_row(label: str, val: str, y_pos: float):
        c.setFont(font_bold, 9.5)
        c.drawString(margin_left, y_pos, label)
        val_x = margin_left + 145
        max_val_w = width - margin_right - val_x
        draw_fitted_string(c, val, val_x, y_pos, max_val_w, font_reg, 9.5, colors.black)

    draw_meta_row("Заказчик разработки:", investor_org_name or investor_rep_name or "Инвестор", y)
    y -= 20
    draw_meta_row("Головной исполнитель:", lab_org_name or "Научная организация", y)
    y -= 20
    draw_meta_row("Научный руководитель:", lab_rep_name or "Ведущий научный сотрудник", y)

    # Внизу титульного листа
    c.setFont(font_reg, 10)
    c.drawCentredString(width / 2, 57, "Москва — 2026")
    c.showPage()

    # Сквозная пагинация разделов
    cur_page = 2

    def render_section(heading: str, body: str):
        nonlocal cur_page
        cur_y = height - 57

        # Заголовок секции
        c.setFont(font_bold, 12)
        c.setFillColor(colors.black)
        c.drawCentredString(width / 2, cur_y, heading.upper())
        cur_y -= 28

        c.setFont(font_reg, 10.5)
        line_height = 15

        paragraphs = [p.strip() for p in body.split("\n") if p.strip()]
        if not paragraphs:
            paragraphs = ["—"]

        for p in paragraphs:
            words = p.split()
            first_line = True
            cur_line = ""
            indent_prefix = "        "  # ~1.25 см красная строка

            w_idx = 0
            while w_idx < len(words):
                w = words[w_idx]
                prefix = (indent_prefix if first_line else "")
                test_line = (cur_line + " " + w) if cur_line else (prefix + w)

                if c.stringWidth(test_line, font_reg, 10.5) <= content_width:
                    cur_line = test_line
                    w_idx += 1
                else:
                    if not cur_line:
                        # Слово само по себе длиннее всей строки (обрезаем по частям)
                        part = ""
                        for ch in w:
                            if c.stringWidth(prefix + part + ch, font_reg, 10.5) <= content_width:
                                part += ch
                            else:
                                break
                        if not part:
                            part = w[:20]
                        cur_line = prefix + part
                        words[w_idx] = w[len(part):]

                    # Проверка нижней границы листа перед печатью строки
                    if cur_y < 65:
                        c.setFont(font_reg, 9)
                        c.drawCentredString(width / 2, 38, str(cur_page))
                        c.showPage()
                        cur_page += 1
                        cur_y = height - 57
                        c.setFont(font_reg, 10.5)

                    c.drawString(margin_left, cur_y, cur_line)
                    cur_y -= line_height
                    first_line = False
                    cur_line = ""

            if cur_line:
                if cur_y < 65:
                    c.setFont(font_reg, 9)
                    c.drawCentredString(width / 2, 38, str(cur_page))
                    c.showPage()
                    cur_page += 1
                    cur_y = height - 57
                    c.setFont(font_reg, 10.5)

                c.drawString(margin_left, cur_y, cur_line)
                cur_y -= line_height

            # Межабзацный отступ
            cur_y -= 8

        # Отрисовка номера страницы внизу и завершение раздела
        c.setFont(font_reg, 9)
        c.drawCentredString(width / 2, 38, str(cur_page))
        c.showPage()
        cur_page += 1

    # Подготовка текстов разделов
    executors_text = ""
    if executors:
        for ex in executors:
            name = ex.get("name", "Исполнитель")
            role = ex.get("role", "Научный сотрудник")
            degree = ex.get("degree", "")
            deg_str = f", {degree}" if degree else ""
            executors_text += f"• {name} — {role}{deg_str}\n"
    else:
        executors_text = f"• {lab_rep_name or 'Руководитель лаборатории'} — руководитель работ, сбор и анализ результатов.\n• Коллектив научного подразделения организации-исполнителя."

    references_text = ""
    if references:
        for idx, ref in enumerate(references, 1):
            references_text += f"{idx}. {ref}\n"
    else:
        references_text = (
            "1. ГОСТ 7.32-2017. Система стандартов по информации, библиотечному и издательскому делу. Отчет о научно-исследовательской работе. Структура и правила оформления.\n"
            "2. Гражданский кодекс Российской Федерации. Часть 4. Права на результаты интеллектуальной деятельности и средства индивидуализации."
        )

    # 1. СПИСОК ИСПОЛНИТЕЛЕЙ
    render_section("СПИСОК ИСПОЛНИТЕЛЕЙ", executors_text)

    # 2. РЕФЕРАТ
    render_section(
        "РЕФЕРАТ",
        abstract_text or f"Отчет содержит результаты выполнения этапа №{milestone_step} «{milestone_title}» по проекту «{project_title}». Проведен комплекс теоретических и прикладных исследований, получены экспериментальные данные, подтверждающие заявленные технические параметры.",
    )

    # 3. ВВЕДЕНИЕ
    render_section(
        "ВВЕДЕНИЕ",
        intro_text or f"Целью этапа является разработка и валидация научно-технических решений в соответствии с требованиями технического задания на проведение НИОКР «{project_title}». Актуальность работы обусловлена необходимостью импортозамещения и технологического суверенитета в заявленной отрасли.",
    )

    # 4. ОСНОВНАЯ ЧАСТЬ
    render_section("1. ОСНОВНЫЕ РЕЗУЛЬТАТЫ И НАУЧНО-ТЕХНИЧЕСКАЯ ЧАСТЬ", main_research_text or "Научно-исследовательские работы проведены в полном объеме.")

    # 5. ЗАКЛЮЧЕНИЕ
    render_section(
        "ЗАКЛЮЧЕНИЕ",
        conclusion_text or f"В ходе выполнения этапа №{milestone_step} научно-технические задачи решены в полном объеме. Полученные параметры соответствуют Техническому заданию. Рекомендуется переход к следующему этапу реализации проекта.",
    )

    # 6. СПИСОК ИСПОЛЬЗОВАННЫХ ИСТОЧНИКОВ
    render_section("СПИСОК ИСПОЛЬЗОВАННЫХ ИСТОЧНИКОВ", references_text)

    c.save()
    return output_path
