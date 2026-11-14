import os
import hashlib
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from fastapi.responses import FileResponse
from sqlalchemy import select, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.certificate import DepositCertificate
from app.services.certificate_service import get_or_create_deposit_certificate

router = APIRouter()


@router.get("/{entity_type}/{entity_id}/download")
async def download_certificate_pdf(
    entity_type: str,
    entity_id: int,
    db: AsyncSession = Depends(get_db),
):
    """
    Генерирует и отдает официальный PDF-сертификат депонирования и авторского приоритета.
    """
    if entity_type not in ["idea", "task", "project"]:
        raise HTTPException(status_code=400, detail="Неверный тип сущности")

    try:
        cert = await get_or_create_deposit_certificate(db, entity_type, entity_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

    if not cert.pdf_file_path or not os.path.exists(cert.pdf_file_path):
        raise HTTPException(status_code=500, detail="Файл сертификата не сформирован на сервере")

    filename = f"Certificate_{cert.certificate_number}.pdf"
    return FileResponse(
        cert.pdf_file_path,
        media_type="application/pdf",
        filename=filename,
    )


@router.get("/{entity_type}/{entity_id}/info")
async def get_certificate_info(
    entity_type: str,
    entity_id: int,
    db: AsyncSession = Depends(get_db),
):
    """
    Возвращает метаданные свидетельства о депонировании РИД.
    """
    query = select(DepositCertificate).where(
        DepositCertificate.entity_type == entity_type,
        DepositCertificate.entity_id == entity_id,
    )
    res = await db.execute(query)
    cert = res.scalar_one_or_none()
    if not cert:
        try:
            cert = await get_or_create_deposit_certificate(db, entity_type, entity_id)
        except Exception:
            raise HTTPException(status_code=404, detail="Свидетельство не найдено")

    return {
        "certificate_number": cert.certificate_number,
        "sha256_hash": cert.sha256_hash,
        "entity_type": cert.entity_type,
        "entity_id": cert.entity_id,
        "object_title": cert.object_title,
        "metadata": cert.metadata_snapshot,
        "deposited_at": cert.deposited_at.isoformat() if cert.deposited_at else None,
        "download_url": f"/api/v1/certificates/{cert.entity_type}/{cert.entity_id}/download",
    }


@router.get("/public/verify/{search_key}")
async def verify_certificate_public(
    search_key: str,
    db: AsyncSession = Depends(get_db),
):
    """
    Публичная верификация свидетельства по SHA-256 хешу или номеру сертификата (TR-2026-...).
    Доступна без авторизации для любых внешних систем, патентных поверенных и экспертов.
    """
    clean_key = search_key.strip()
    query = select(DepositCertificate).where(
        or_(
            DepositCertificate.sha256_hash.ilike(clean_key),
            DepositCertificate.certificate_number.ilike(clean_key),
        )
    )
    res = await db.execute(query)
    cert = res.scalar_one_or_none()

    if not cert:
        return {
            "valid": False,
            "message": f"Запись с отпечатком или номером «{clean_key}» не найдена в распределенном депозитарии.",
        }

    meta = cert.metadata_snapshot or {}
    return {
        "valid": True,
        "status": "VERIFIED_ACTIVE",
        "certificate_number": cert.certificate_number,
        "sha256_hash": cert.sha256_hash,
        "object_title": cert.object_title,
        "entity_type": cert.entity_type,
        "author_name": meta.get("author_name", "Автор не указан"),
        "org_name": meta.get("org_name", ""),
        "inn": meta.get("inn"),
        "ogrn": meta.get("ogrn"),
        "entity_type_label": meta.get("entity_type_label", "Объект РИД"),
        "deposited_at": cert.deposited_at.strftime("%d.%m.%Y в %H:%M:%S MSK (UTC+3)") if cert.deposited_at else None,
        "download_url": f"/api/v1/certificates/{cert.entity_type}/{cert.entity_id}/download",
        "legal_basis": "Статьи 1257, 1259 ГК РФ, Бернская конвенция (Презумпция авторства и фиксация приоритета)",
    }


@router.post("/public/verify/check-file")
async def verify_file_public(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
):
    """
    Вычисляет контрольную сумму загруженного пользователем файла и ищет совпадение в депозитарии.
    """
    file_bytes = await file.read()
    file_hash = hashlib.sha256(file_bytes).hexdigest()

    # Поиск по точному совпадению хеша или вхождению в метаданные
    query = select(DepositCertificate).where(DepositCertificate.sha256_hash == file_hash)
    res = await db.execute(query)
    cert = res.scalar_one_or_none()

    if cert:
        meta = cert.metadata_snapshot or {}
        return {
            "matched": True,
            "file_sha256": file_hash,
            "certificate_number": cert.certificate_number,
            "object_title": cert.object_title,
            "author_name": meta.get("author_name"),
            "deposited_at": cert.deposited_at.strftime("%d.%m.%Y %H:%M:%S") if cert.deposited_at else None,
        }

    return {
        "matched": False,
        "file_sha256": file_hash,
        "message": f"Контрольная сумма файла ({file_hash[:16]}...) не зарегистрирована в реестре.",
    }
