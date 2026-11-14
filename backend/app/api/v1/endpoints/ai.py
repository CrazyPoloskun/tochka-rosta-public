from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from pydantic import BaseModel
from typing import Optional

from app.core.deps import get_current_user
from app.models.user import User
from app.services.ai_service import (
    extract_text_from_pdf,
    parse_pdf_to_project_data,
    generate_report_ai_summary,
    generate_task_tz_ai,
    get_ai_status,
)

router = APIRouter()


class GenerateTzRequest(BaseModel):
    title: Optional[str] = ""
    query: str
    industry: Optional[str] = None


class SummarizeReportRequest(BaseModel):
    milestone_title: str
    raw_report: str


@router.get("/status", status_code=status.HTTP_200_OK)
async def check_status():
    """Возвращает текущее состояние ИИ-модуля и подключенного провайдера."""
    return get_ai_status()


@router.post("/parse-pdf", status_code=status.HTTP_200_OK)
async def parse_pdf_endpoint(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Поддерживаются только файлы формата PDF.",
        )

    file_bytes = await file.read()
    if len(file_bytes) == 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Файл пуст.")

    # Извлечение текста
    extracted_text = extract_text_from_pdf(file_bytes)
    # ИИ структурирование через OpenRouter LLM или offline fallback
    project_data = await parse_pdf_to_project_data(extracted_text)

    return {
        "success": True,
        "filename": file.filename,
        "data": project_data,
        "extracted_preview": extracted_text[:500] + "..." if len(extracted_text) > 500 else extracted_text,
    }


@router.post("/generate-tz", status_code=status.HTTP_200_OK)
@router.post("/generate-technical-spec", status_code=status.HTTP_200_OK)
async def generate_tz_endpoint(
    data: GenerateTzRequest,
    current_user: User = Depends(get_current_user),
):
    """Генерирует структурированное техническое задание по краткой идее инвестора."""
    if not data.query or len(data.query.strip()) < 3:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Пожалуйста, опишите задачу хотя бы несколькими словами.",
        )
    result = await generate_task_tz_ai(data.title or "", data.query, data.industry)
    return result


@router.post("/summarize-report", status_code=status.HTTP_200_OK)
async def summarize_report_endpoint(
    data: SummarizeReportRequest,
    current_user: User = Depends(get_current_user),
):
    """Формирует выжимку из научно-технического отчета этапа проекта."""
    if not data.raw_report or len(data.raw_report.strip()) < 10:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Отчет слишком короткий для формирования аналитического саммари.",
        )
    summary = await generate_report_ai_summary(data.raw_report, data.milestone_title)
    return {"summary": summary}
