import io
import os
from decimal import Decimal
from datetime import datetime
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

FONT_DIR = os.path.join(os.path.dirname(__file__), "..", "assets", "fonts")
try:
    arial_path = os.path.join(FONT_DIR, "arial.ttf")
    arialbd_path = os.path.join(FONT_DIR, "arialbd.ttf")
    if os.path.exists(arial_path):
        pdfmetrics.registerFont(TTFont("CustomArial", arial_path))
    if os.path.exists(arialbd_path):
        pdfmetrics.registerFont(TTFont("CustomArialBold", arialbd_path))
except Exception:
    pass


def generate_receipt_pdf(
    tx_id: int,
    amount: Decimal | float,
    operation_label: str,
    payer_name: str,
    payer_inn: str,
    recipient_name: str,
    recipient_inn: str,
    purpose: str,
    created_at: datetime,
) -> bytes:
    """Генерирует официальный банковский платёжный чек / квитанцию в формате PDF."""
    buf = io.BytesIO()
    c = canvas.Canvas(buf, pagesize=A4)
    width, height = A4  # 595.27 x 841.89

    font_reg = "CustomArial" if "CustomArial" in pdfmetrics.getRegisteredFontNames() else "Helvetica"
    font_bold = "CustomArialBold" if "CustomArialBold" in pdfmetrics.getRegisteredFontNames() else "Helvetica-Bold"

    margin = 40
    content_w = width - 2 * margin

    # Внешняя аккуратная рамка документа
    c.setStrokeColor(colors.HexColor("#E2E8F0"))
    c.setLineWidth(1)
    c.roundRect(margin, margin, content_w, height - 2 * margin, 8, stroke=1, fill=0)

    # 1. Шапка: Логотип и реквизиты документа
    y = height - margin - 35
    logo_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "assets", "logo.png")
    if os.path.exists(logo_path):
        try:
            logo_h = 24
            logo_w = logo_h * (1287.0 / 356.0)
            c.drawImage(logo_path, margin + 18, y - 6, width=logo_w, height=logo_h, mask="auto")
        except Exception:
            pass

    # Правая часть шапки: статус «ИСПОЛНЕНО»
    c.setFillColor(colors.HexColor("#ECFDF5"))
    c.setStrokeColor(colors.HexColor("#A7F3D0"))
    c.setLineWidth(1)
    badge_w = 110
    badge_h = 22
    badge_x = width - margin - 18 - badge_w
    c.roundRect(badge_x, y - 4, badge_w, badge_h, 4, stroke=1, fill=1)

    c.setFont(font_bold, 8.5)
    c.setFillColor(colors.HexColor("#065F46"))
    c.drawCentredString(badge_x + badge_w / 2, y + 3, "✓  ИСПОЛНЕНО")

    # Разделитель шапки
    y -= 22
    c.setStrokeColor(colors.HexColor("#F1F5F9"))
    c.setLineWidth(1)
    c.line(margin + 18, y, width - margin - 18, y)

    # 2. Название документа и номер
    y -= 30
    c.setFont(font_bold, 17)
    c.setFillColor(colors.HexColor("#0F172A"))
    c.drawString(margin + 18, y, "Квитанция о переводе денежных средств")

    y -= 18
    c.setFont(font_reg, 9.5)
    c.setFillColor(colors.HexColor("#64748B"))
    c.drawString(margin + 18, y, f"Электронный платёжный чек № ТР-ПП-{tx_id:06d}")

    # 3. Карточка суммы платежа
    card_h = 62
    y -= (18 + card_h)  # Отступаем 18 pt вниз от текста номера чека и резервируем высоту блока
    c.setFillColor(colors.HexColor("#F8FAFC"))
    c.setStrokeColor(colors.HexColor("#E2E8F0"))
    c.setLineWidth(1)
    c.roundRect(margin + 18, y, content_w - 36, card_h, 8, stroke=1, fill=1)

    c.setFont(font_bold, 8.5)
    c.setFillColor(colors.HexColor("#64748B"))
    c.drawString(margin + 34, y + card_h - 20, (operation_label or "Финансовая операция").upper())

    amt_val = float(amount)
    amt_formatted = f"{amt_val:,.2f} ₽".replace(",", " ")
    c.setFont(font_bold, 20)
    c.setFillColor(colors.HexColor("#0F172A"))
    c.drawString(margin + 34, y + 14, amt_formatted)

    # 4. Стороны перевода: Плательщик и Получатель
    side_w = (content_w - 36 - 16) / 2
    side_h = 76
    y -= (16 + side_h)  # Отступаем 16 pt вниз от карточки суммы

    # Блок плательщика
    p_x = margin + 18
    p_y = y
    c.setFillColor(colors.HexColor("#FFFFFF"))
    c.setStrokeColor(colors.HexColor("#E2E8F0"))
    c.roundRect(p_x, p_y, side_w, side_h, 6, stroke=1, fill=1)

    c.setFont(font_bold, 8)
    c.setFillColor(colors.HexColor("#64748B"))
    c.drawString(p_x + 14, p_y + side_h - 16, "ОТПРАВИТЕЛЬ (ПЛАТЕЛЬЩИК)")

    c.setFont(font_bold, 9.5)
    c.setFillColor(colors.HexColor("#0F172A"))
    payer_display = (payer_name or "Участник платформы")
    if len(payer_display) > 30:
        payer_display = payer_display[:28] + "..."
    c.drawString(p_x + 14, p_y + side_h - 34, payer_display)

    c.setFont(font_reg, 8.5)
    c.setFillColor(colors.HexColor("#64748B"))
    c.drawString(p_x + 14, p_y + side_h - 50, f"ИНН: {payer_inn or 'не указан'}")
    c.drawString(p_x + 14, p_y + side_h - 64, "Банк: АО «Т-Банк» (Эскроу-счёт)")

    # Блок получателя
    r_x = p_x + side_w + 16
    r_y = p_y
    c.setFillColor(colors.HexColor("#FFFFFF"))
    c.setStrokeColor(colors.HexColor("#E2E8F0"))
    c.roundRect(r_x, r_y, side_w, side_h, 6, stroke=1, fill=1)

    c.setFont(font_bold, 8)
    c.setFillColor(colors.HexColor("#64748B"))
    c.drawString(r_x + 14, r_y + side_h - 16, "ПОЛУЧАТЕЛЬ СРЕДСТВ")

    c.setFont(font_bold, 9.5)
    c.setFillColor(colors.HexColor("#0F172A"))
    rec_display = (recipient_name or "Участник платформы")
    if len(rec_display) > 30:
        rec_display = rec_display[:28] + "..."
    c.drawString(r_x + 14, r_y + side_h - 34, rec_display)

    c.setFont(font_reg, 8.5)
    c.setFillColor(colors.HexColor("#64748B"))
    c.drawString(r_x + 14, r_y + side_h - 50, f"ИНН: {recipient_inn or 'не указан'}")
    c.drawString(r_x + 14, r_y + side_h - 64, "Банк: АО «Т-Банк»")

    # 5. Детализированная таблица транзакции
    y = p_y - 20
    dt_str = created_at.strftime("%d.%m.%Y в %H:%M:%S MSK") if created_at else datetime.now().strftime("%d.%m.%Y в %H:%M:%S MSK")

    table_rows = [
        ("Дата и время операции:", dt_str),
        ("Уникальный номер транзакции:", f"#{tx_id}"),
        ("Назначение платежа:", (purpose or "Исполнение обязательств по соглашению на платформе «Точка Роста»")),
        ("Способ проведения:", "Система быстрых платежей / Банковский клиринг"),
        ("Комиссия сервиса:", "0.00 ₽ (0%)"),
        ("Оператор расчётов:", "ООО «ТОЧКА РОСТА» (ОГРН 1247700123456, ИНН 7701982345)"),
    ]

    t_w = content_w - 36
    t_y = y
    row_h = 20
    for label, val in table_rows:
        c.setStrokeColor(colors.HexColor("#F1F5F9"))
        c.setLineWidth(1)
        c.line(margin + 18, t_y, margin + 18 + t_w, t_y)
        t_y -= row_h

        c.setFont(font_bold, 8.5)
        c.setFillColor(colors.HexColor("#64748B"))
        c.drawString(margin + 24, t_y + 6, label)

        c.setFont(font_reg, 8.5)
        c.setFillColor(colors.HexColor("#0F172A"))
        # Truncate value if too long
        v_str = str(val)
        if len(v_str) > 52:
            v_str = v_str[:49] + "..."
        c.drawRightString(margin + 18 + t_w - 8, t_y + 6, v_str)

    c.setStrokeColor(colors.HexColor("#F1F5F9"))
    c.setLineWidth(1)
    c.line(margin + 18, t_y, margin + 18 + t_w, t_y)

    # 6. Официальный банковский штамп (БЕЗ ЭЦП)
    stamp_w = 230
    stamp_h = 72
    stamp_x = margin + 24
    stamp_y = max(margin + 45, t_y - 24 - stamp_h)

    c.setStrokeColor(colors.HexColor("#0284C7"))
    c.setLineWidth(1.4)
    c.roundRect(stamp_x, stamp_y, stamp_w, stamp_h, 5, stroke=1, fill=0)

    c.setStrokeColor(colors.HexColor("#BAE6FD"))
    c.setLineWidth(0.6)
    c.roundRect(stamp_x + 3, stamp_y + 3, stamp_w - 6, stamp_h - 6, 4, stroke=1, fill=0)

    c.setFont(font_bold, 8)
    c.setFillColor(colors.HexColor("#0369A1"))
    c.drawCentredString(stamp_x + stamp_w / 2, stamp_y + stamp_h - 15, "АО «Т-БАНК» • ПЛАТЁЖНЫЙ ШЛЮЗ")

    c.setFont(font_bold, 10)
    c.setFillColor(colors.HexColor("#0284C7"))
    c.drawCentredString(stamp_x + stamp_w / 2, stamp_y + stamp_h - 30, "ПЕРЕВОД ИСПОЛНЕН")

    c.setFont(font_reg, 7.5)
    c.setFillColor(colors.HexColor("#0369A1"))
    c.drawCentredString(stamp_x + stamp_w / 2, stamp_y + stamp_h - 44, f"Дата проводки: {created_at.strftime('%d.%m.%Y')}")
    c.drawCentredString(stamp_x + stamp_w / 2, stamp_y + stamp_h - 56, f"БИК: 044525974 • Корр. счёт 30101810145250000974")

    # Текст справа от штампа
    side_text_x = stamp_x + stamp_w + 18
    side_text_w = width - margin - 24 - side_text_x
    c.setFont(font_reg, 7.5)
    c.setFillColor(colors.HexColor("#64748B"))
    legal_p = (
        "Документ подтверждает факт перечисления денежных средств по указанным банковским реквизитам "
        "через расчётный контур Системы быстрых платежей платформы «Точка Роста». "
        "Имеет юридическую силу платёжного поручения."
    )
    t_obj = c.beginText(side_text_x, stamp_y + stamp_h - 16)
    t_obj.setFont(font_reg, 7.5)
    t_obj.setLeading(11)
    for word in legal_p.split():
        line = t_obj.textLine if False else None
    words = legal_p.split()
    line = ""
    for w in words:
        if c.stringWidth(line + " " + w, font_reg, 7.5) < side_text_w:
            line = line + (" " if line else "") + w
        else:
            t_obj.textLine(line)
            line = w
    if line:
        t_obj.textLine(line)
    c.drawText(t_obj)

    # 7. Подвал документа
    c.setFont(font_reg, 7)
    c.setFillColor(colors.HexColor("#94A3B8"))
    c.drawCentredString(width / 2, margin + 18, "Официальный платёжный чек • Платформа трансфера технологий «Точка Роста» • help@tochkarosta.ru")

    c.showPage()
    c.save()
    buf.seek(0)
    return buf.getvalue()
