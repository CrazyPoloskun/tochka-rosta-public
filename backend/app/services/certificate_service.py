import os
import io
import hashlib
import random
import string
from datetime import datetime
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
import qrcode
from PIL import Image

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.certificate import DepositCertificate
from app.models.user import User
from app.models.idea import Idea
from app.models.task import Task

UPLOAD_DIR = os.environ.get("UPLOAD_DIR", "uploads")
FRONTEND_URL = os.environ.get("FRONTEND_URL", "https://83-141-68-181.sslip.io")

# Регистрация шрифтов
FONT_DIR = os.path.join(os.path.dirname(__file__), "..", "assets", "fonts")
try:
    arial_path = os.path.join(FONT_DIR, "arial.ttf")
    arialbd_path = os.path.join(FONT_DIR, "arialbd.ttf")
    times_path = os.path.join(FONT_DIR, "times.ttf")
    timesbd_path = os.path.join(FONT_DIR, "timesbd.ttf")

    if os.path.exists(arial_path):
        pdfmetrics.registerFont(TTFont("CustomArial", arial_path))
    if os.path.exists(arialbd_path):
        pdfmetrics.registerFont(TTFont("CustomArialBold", arialbd_path))
    if os.path.exists(times_path):
        pdfmetrics.registerFont(TTFont("CustomTimes", times_path))
    if os.path.exists(timesbd_path):
        pdfmetrics.registerFont(TTFont("CustomTimesBold", timesbd_path))
except Exception as e:
    print(f"[CERT SERVICE] Font registration error: {e}")


def generate_certificate_number(year: int = 2026) -> str:
    suffix = "".join(random.choices(string.ascii_uppercase + string.digits, k=6))
    return f"TR-{year}-{suffix}"


def generate_qr_buffer(url: str) -> io.BytesIO:
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=10,
        border=1,
    )
    qr.add_data(url)
    qr.make(fit=True)
    img = qr.make_image(fill_color="#111111", back_color="white")
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)
    return buf


def draw_fitted_string(c, text: str, x: float, y: float, max_w: float, font_name: str, font_size: float, fill_color):
    """Отрисовывает строку, гарантируя, что она никогда не выйдет за пределы max_w."""
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


def render_pdf_certificate(
    output_path: str,
    cert_number: str,
    sha256_hash: str,
    object_title: str,
    entity_type_label: str,
    author_name: str,
    org_name: str,
    inn: str | None,
    ogrn: str | None,
    deposited_dt: datetime,
    verify_url: str,
):
    dir_p = os.path.dirname(output_path)
    if dir_p:
        os.makedirs(dir_p, exist_ok=True)
    c = canvas.Canvas(output_path, pagesize=A4)
    width, height = A4  # 595.27 x 841.89

    # Шрифт
    font_reg = "CustomArial" if "CustomArial" in pdfmetrics.getRegisteredFontNames() else "Helvetica"
    font_bold = "CustomArialBold" if "CustomArialBold" in pdfmetrics.getRegisteredFontNames() else "Helvetica-Bold"

    # Декоративная рамка (Двойной строгий контур)
    margin = 36  # ~0.5 inch
    c.setStrokeColor(colors.HexColor("#111111"))
    c.setLineWidth(2)
    c.rect(margin, margin, width - 2 * margin, height - 2 * margin)

    c.setStrokeColor(colors.HexColor("#F81B00"))
    c.setLineWidth(0.8)
    c.rect(margin + 5, margin + 5, width - 2 * margin - 10, height - 2 * margin - 10)

    # Угловые маркеры
    corner_size = 14
    for cx, cy in [
        (margin + 5, margin + 5),
        (width - margin - 5, margin + 5),
        (margin + 5, height - margin - 5),
        (width - margin - 5, height - margin - 5),
    ]:
        c.setFillColor(colors.HexColor("#F81B00"))
        c.circle(cx, cy, 3, stroke=0, fill=1)

    # Верхний заголовок / Шапка
    y = height - margin - 35
    c.setFont(font_bold, 11)
    c.setFillColor(colors.HexColor("#737373"))
    c.drawCentredString(width / 2, y, "ЕДИНЫЙ РАСПРЕДЕЛЕННЫЙ ДЕПОЗИТАРИЙ РИД")

    y -= 14
    c.setFont(font_bold, 13)
    c.setFillColor(colors.HexColor("#111111"))
    c.drawCentredString(width / 2, y, "ЦИФРОВАЯ ПЛАТФОРМА ТРАНСФЕРА ТЕХНОЛОГИЙ «ТОЧКА РОСТА»")

    # Горизонтальная линия
    y -= 18
    c.setStrokeColor(colors.HexColor("#E2E5EB"))
    c.setLineWidth(1)
    c.line(margin + 30, y, width - margin - 30, y)

    # Название документа
    y -= 40
    c.setFont(font_bold, 20)
    c.setFillColor(colors.HexColor("#111111"))
    c.drawCentredString(width / 2, y, "СВИДЕТЕЛЬСТВО О ДЕПОНИРОВАНИИ")

    y -= 22
    c.setFont(font_bold, 15)
    c.setFillColor(colors.HexColor("#F81B00"))
    c.drawCentredString(width / 2, y, "И АВТОРСКОМ ПРИОРИТЕТЕ ОБЪЕКТА РИД")

    # Номер свидетельства
    y -= 30
    c.setFont(font_bold, 12)
    c.setFillColor(colors.HexColor("#111111"))
    c.drawCentredString(width / 2, y, f"Регистрационный номер: {cert_number}")

    # Вводная преамбула
    y -= 30
    c.setFont(font_reg, 10.5)
    c.setFillColor(colors.HexColor("#333333"))
    preamble = (
        "Настоящим удостоверяется, что нижеуказанный объект интеллектуальной собственности "
        "был внесен в распределенный реестр платформы «Точка Роста» с точной фиксацией "
        "цифрового отпечатка (Prior Art / Proof of Existence) и даты приоритета."
    )
    # Многострочный вывод преамбулы
    text_obj = c.beginText(margin + 35, y)
    text_obj.setFont(font_reg, 10)
    text_obj.setLeading(14)
    # Разбивка на строки
    words = preamble.split()
    line = ""
    for w in words:
        if c.stringWidth(line + " " + w, font_reg, 10) < (width - 2 * margin - 70):
            line = line + (" " if line else "") + w
        else:
            text_obj.textLine(line)
            line = w
    if line:
        text_obj.textLine(line)
    c.drawText(text_obj)

    # Досье объекта
    y -= 55
    card_x = margin + 25
    card_w = width - 2 * margin - 50
    card_h = 160
    c.setFillColor(colors.HexColor("#F9FAFB"))
    c.setStrokeColor(colors.HexColor("#E2E5EB"))
    c.setLineWidth(1)
    c.roundRect(card_x, y - card_h, card_w, card_h, 6, stroke=1, fill=1)

    dy = y - 22
    fields = [
        ("Наименование объекта:", object_title),
        ("Тип объекта РИД:", entity_type_label),
        ("Правообладатель / Автор:", author_name),
        ("Организация:", org_name if org_name else "Индивидуальный разработчик"),
        ("Реквизиты (ИНН / ОГРН):", f"ИНН {inn or 'не указан'}" + (f" | ОГРН {ogrn}" if ogrn else "")),
        ("Дата и время фиксации:", deposited_dt.strftime("%d.%m.%Y в %H:%M:%S MSK (UTC+3)")),
    ]

    val_max_w = card_w - 185 - 15  # Безопасная граница внутри карточки

    for label, val in fields:
        c.setFont(font_bold, 9.5)
        c.setFillColor(colors.HexColor("#555555"))
        c.drawString(card_x + 18, dy, label)

        draw_fitted_string(c, val, card_x + 185, dy, val_max_w, font_reg, 9.5, colors.HexColor("#111111"))
        dy -= 23

    # Блок криптографического отпечатка SHA-256
    y = y - card_h - 25
    c.setFont(font_bold, 10)
    c.setFillColor(colors.HexColor("#111111"))
    c.drawString(margin + 25, y, "ЦИФРОВОЙ КРИПТОГРАФИЧЕСКИЙ ОТПЕЧАТОК (SHA-256 CHECKSUM):")

    y -= 32
    hash_box_x = margin + 25
    hash_box_w = width - 2 * margin - 50
    hash_box_h = 26
    c.setFillColor(colors.HexColor("#111111"))
    c.roundRect(hash_box_x, y, hash_box_w, hash_box_h, 4, stroke=0, fill=1)

    c.setFont("Courier-Bold" if "Courier-Bold" in pdfmetrics.getRegisteredFontNames() else "Helvetica-Bold", 9)
    c.setFillColor(colors.HexColor("#FFFFFF"))
    c.drawCentredString(width / 2, y + 8, sha256_hash)

    # Нижний блок: QR-код, Электронная печать, Юридическая сноска
    y -= 25

    # Генерация QR кода
    qr_buf = generate_qr_buffer(verify_url)
    from reportlab.lib.utils import ImageReader
    qr_reader = ImageReader(qr_buf)

    qr_size = 90
    qr_x = width - margin - 25 - qr_size
    qr_y = margin + 50
    c.drawImage(qr_reader, qr_x, qr_y, width=qr_size, height=qr_size)

    c.setFont(font_reg, 8)
    c.setFillColor(colors.HexColor("#737373"))
    c.drawCentredString(qr_x + qr_size / 2, qr_y - 10, "Сканируйте для проверки")

    # Круглая печать реестра (слева)
    stamp_x = margin + 85
    stamp_y = qr_y + qr_size / 2
    c.setStrokeColor(colors.HexColor("#0284C7"))
    c.setLineWidth(1.8)
    c.circle(stamp_x, stamp_y, 40, stroke=1, fill=0)
    c.setLineWidth(0.6)
    c.circle(stamp_x, stamp_y, 36, stroke=1, fill=0)

    c.setFont(font_bold, 6.5)
    c.setFillColor(colors.HexColor("#0284C7"))
    c.drawCentredString(stamp_x, stamp_y + 20, "ЕДИНЫЙ РЕЕСТР")
    c.drawCentredString(stamp_x, stamp_y + 10, "ТОЧКА РОСТА")
    c.setFont(font_bold, 9)
    c.drawCentredString(stamp_x, stamp_y - 2, "ВЕРИФИЦИРОВАНО")
    c.setFont(font_reg, 6.5)
    c.drawCentredString(stamp_x, stamp_y - 14, "ЭЦП ДЕПОЗИТАРИЯ")
    c.drawCentredString(stamp_x, stamp_y - 23, deposited_dt.strftime("%d.%m.%Y"))

    # Текст по центру между печатью и QR
    center_text_x = margin + 145
    center_text_w = qr_x - center_text_x - 15
    legal_text = (
        "Свидетельство выдано на основании ст. 1257 и 1259 Гражданского кодекса РФ "
        "и положений Бернской конвенции об охране литературных и художественных произведений. "
        "Является надлежащим доказательством первенства и существования научно-технического решения "
        "в судебных и арбитражных спорах."
    )
    l_obj = c.beginText(center_text_x, qr_y + qr_size - 10)
    l_obj.setFont(font_reg, 7.5)
    l_obj.setFillColor(colors.HexColor("#666666"))
    l_obj.setLeading(11)
    words = legal_text.split()
    line = ""
    for w in words:
        if c.stringWidth(line + " " + w, font_reg, 7.5) < center_text_w:
            line = line + (" " if line else "") + w
        else:
            l_obj.textLine(line)
            line = w
    if line:
        l_obj.textLine(line)
    c.drawText(l_obj)

    # Подвал
    c.setFont(font_reg, 7.5)
    c.setFillColor(colors.HexColor("#555555"))
    c.drawCentredString(
        width / 2,
        margin + 20,
        f"Публичный реестр верификации: {verify_url}",
    )
    c.setFont(font_reg, 6.8)
    c.setFillColor(colors.HexColor("#888888"))
    c.drawCentredString(
        width / 2,
        margin + 10,
        "Официальный электронный документ • Цифровая платформа трансфера технологий «Точка Роста»",
    )

    c.showPage()
    c.save()


async def get_or_create_deposit_certificate(
    db: AsyncSession,
    entity_type: str,
    entity_id: int,
    force_regenerate: bool = False,
) -> DepositCertificate:
    """
    Получает существующее или создает новое свидетельство о депонировании РИД,
    вычисляет криптографический SHA-256 и формирует официальный PDF-файл.
    """
    # 1. Поиск существующего
    query = select(DepositCertificate).where(
        DepositCertificate.entity_type == entity_type,
        DepositCertificate.entity_id == entity_id,
    )
    res = await db.execute(query)
    cert = res.scalar_one_or_none()
    if not force_regenerate and cert and cert.pdf_file_path and os.path.exists(cert.pdf_file_path):
        return cert

    # 2. Сбор данных сущности
    author_id = 1
    object_title = ""
    entity_type_label = ""
    summary_text = ""
    file_hash = ""
    created_at = datetime.utcnow()

    if entity_type == "idea":
        i_res = await db.execute(select(Idea).where(Idea.id == entity_id))
        idea = i_res.scalar_one_or_none()
        if not idea:
            raise ValueError("Идея не найдена")
        author_id = idea.author_id
        object_title = idea.title
        entity_type_label = "Научно-техническая разработка (НИОКР / РИД)" if idea.type == "lab_tech" else "Инновационная бизнес-идея"
        summary_text = idea.summary
        file_hash = idea.file_hash
        created_at = idea.created_at or datetime.utcnow()
    elif entity_type == "task":
        t_res = await db.execute(select(Task).where(Task.id == entity_id))
        task = t_res.scalar_one_or_none()
        if not task:
            raise ValueError("Задача не найдена")
        author_id = task.investor_id
        object_title = task.title
        entity_type_label = "Техническое задание на заказную разработку (R&D)"
        summary_text = task.description
        created_at = task.created_at or datetime.utcnow()
    else:
        raise ValueError(f"Неподдерживаемый тип сущности: {entity_type}")

    # Загрузка автора
    u_res = await db.execute(select(User).where(User.id == author_id))
    user = u_res.scalar_one_or_none()
    author_name = user.full_name if user else "Неизвестный автор"
    org_name = (user.organization_name or user.full_name) if user else ""
    inn = user.inn if user else None
    ogrn = user.ogrn if user else None

    # Вычисление канонического хэша SHA-256
    # Если у объекта уже зафиксирован публичный хеш авторства (file_hash), используем его для 100% валидности в реестре
    if file_hash:
        sha256_hash = file_hash
    else:
        canonical_str = f"{object_title}|{summary_text}|{author_id}|{inn or ''}|{created_at.isoformat()}"
        sha256_hash = hashlib.sha256(canonical_str.encode("utf-8")).hexdigest()

    cert_number = cert.certificate_number if cert else generate_certificate_number()
    verify_url = f"{FRONTEND_URL}/verify/{sha256_hash}"

    # Путь сохранения PDF
    pdf_filename = f"cert_{cert_number}_{sha256_hash[:8]}.pdf"
    pdf_folder = os.path.join(UPLOAD_DIR, "certificates", entity_type)
    pdf_path = os.path.join(pdf_folder, pdf_filename)

    # Генерация документа
    render_pdf_certificate(
        output_path=pdf_path,
        cert_number=cert_number,
        sha256_hash=sha256_hash,
        object_title=object_title,
        entity_type_label=entity_type_label,
        author_name=author_name,
        org_name=org_name,
        inn=inn,
        ogrn=ogrn,
        deposited_dt=created_at,
        verify_url=verify_url,
    )

    metadata = {
        "author_name": author_name,
        "org_name": org_name,
        "inn": inn,
        "ogrn": ogrn,
        "entity_type_label": entity_type_label,
        "summary": summary_text[:500],
        "created_at": created_at.isoformat(),
    }

    if cert:
        cert.sha256_hash = sha256_hash
        cert.pdf_file_path = pdf_path
        cert.metadata_snapshot = metadata
    else:
        cert = DepositCertificate(
            certificate_number=cert_number,
            sha256_hash=sha256_hash,
            author_id=author_id,
            entity_type=entity_type,
            entity_id=entity_id,
            object_title=object_title,
            metadata_snapshot=metadata,
            pdf_file_path=pdf_path,
            deposited_at=created_at,
        )
        db.add(cert)

    await db.commit()
    await db.refresh(cert)
    return cert
