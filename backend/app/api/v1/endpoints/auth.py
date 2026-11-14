import os
import re
import uuid
from datetime import datetime
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from fastapi.responses import FileResponse
from sqlalchemy import select, func, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import (
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
    decode_token,
)
from app.models.user import User
from app.models.finance import Account
from app.models.project import Project
from app.models.idea import Idea
from app.models.task import Task
from app.schemas.user import (
    InvestorRegisterRequest,
    LabRegisterRequest,
    LoginRequest,
    AuthResponse,
    UserResponse,
    PublicUserProfileResponse,
    RefreshTokenRequest,
    TokenRefreshResponse,
    UpdateProfileRequest,
)
from app.core.deps import get_current_user

router = APIRouter()


@router.post("/register/investor", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
async def register_investor(
    data: InvestorRegisterRequest,
    db: AsyncSession = Depends(get_db),
):
    # Check if user already exists
    existing = await db.execute(select(User).where(User.email == data.email.lower()))
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Пользователь с таким email уже зарегистрирован",
        )

    is_admin = (data.email.lower() == "admin@tochkarosta.ru")
    user = User(
        email=data.email.lower(),
        hashed_password=hash_password(data.password),
        full_name=data.full_name.strip(),
        role="investor",
        status="active",
        verification_status="verified",
        is_admin=is_admin,
    )
    db.add(user)
    await db.flush()

    # Автоматическое создание финансового аккаунта
    account = Account(
        user_id=user.id,
        available_balance=Decimal("0.00"),
        frozen_balance=Decimal("0.00"),
    )
    db.add(account)
    await db.commit()
    await db.refresh(user)

    access_token = create_access_token(subject=user.id)
    refresh_token = create_refresh_token(subject=user.id)
    return AuthResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        user=UserResponse.model_validate(user),
    )


@router.post("/register/lab", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
async def register_lab(
    data: LabRegisterRequest,
    db: AsyncSession = Depends(get_db),
):
    # Check if email already registered
    existing = await db.execute(select(User).where(User.email == data.email.lower()))
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Пользователь с таким email уже зарегистрирован",
        )

    # Check if INN already registered
    clean_inn = data.inn.strip()
    existing_inn = await db.execute(select(User).where(User.inn == clean_inn))
    if existing_inn.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Организация с данным ИНН уже зарегистрирована в системе",
        )

    is_admin = (data.email.lower() == "admin@tochkarosta.ru")
    user = User(
        email=data.email.lower(),
        hashed_password=hash_password(data.password),
        full_name=data.organization_name.strip(),
        organization_name=data.organization_name.strip(),
        inn=clean_inn,
        ogrn=data.ogrn.strip(),
        representative_name=data.representative_name.strip(),
        role="lab",
        status="pending",  # НИИ отправляется на проверку модерацией
        verification_status="pending",
        is_admin=is_admin,
    )
    db.add(user)
    await db.flush()

    # Автоматическое создание финансового аккаунта
    account = Account(
        user_id=user.id,
        available_balance=Decimal("0.00"),
        frozen_balance=Decimal("0.00"),
    )
    db.add(account)
    await db.commit()
    await db.refresh(user)

    access_token = create_access_token(subject=user.id)
    refresh_token = create_refresh_token(subject=user.id)
    return AuthResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        user=UserResponse.model_validate(user),
    )


@router.post("/login", response_model=AuthResponse)
async def login(
    data: LoginRequest,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).where(User.email == data.email.lower()))
    user = result.scalar_one_or_none()

    if not user or not verify_password(data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Неверный email или пароль",
        )

    access_token = create_access_token(subject=user.id)
    refresh_token = create_refresh_token(subject=user.id)
    return AuthResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        user=UserResponse.model_validate(user),
    )


@router.post("/refresh", response_model=TokenRefreshResponse)
async def refresh_tokens(
    data: RefreshTokenRequest,
    db: AsyncSession = Depends(get_db),
):
    payload = decode_token(data.refresh_token)
    if not payload or payload.get("type") != "refresh" or "sub" not in payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Недействительный или истекший refresh токен",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        user_id = int(payload["sub"])
    except (ValueError, TypeError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Некорректный идентификатор пользователя в токене",
        )

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Пользователь не найден",
        )

    new_access_token = create_access_token(subject=user.id)
    new_refresh_token = create_refresh_token(subject=user.id)
    return TokenRefreshResponse(
        access_token=new_access_token,
        refresh_token=new_refresh_token,
        token_type="bearer",
    )


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    return UserResponse.model_validate(current_user)


@router.patch("/profile", response_model=UserResponse)
@router.patch("/me", response_model=UserResponse)
async def update_profile(
    data: UpdateProfileRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if data.full_name is not None and data.full_name.strip():
        current_user.full_name = data.full_name.strip()
    if data.representative_name is not None:
        current_user.representative_name = data.representative_name.strip()
    if data.organization_name is not None and data.organization_name.strip():
        current_user.organization_name = data.organization_name.strip()
    if data.inn is not None:
        current_user.inn = data.inn.strip()
    if data.ogrn is not None:
        current_user.ogrn = data.ogrn.strip()
    if data.patents_info is not None:
        current_user.patents_info = data.patents_info
    if data.documents is not None:
        current_user.documents = data.documents
    if data.bio is not None:
        current_user.bio = data.bio.strip()
    if data.website_url is not None:
        current_user.website_url = data.website_url.strip()
    if data.external_links is not None:
        current_user.external_links = data.external_links
    if data.portfolio_files is not None:
        current_user.portfolio_files = data.portfolio_files
    if data.request_reverification and current_user.verification_status == "rejected":
        current_user.verification_status = "pending"
        current_user.moderation_comment = None

    await db.commit()
    await db.refresh(current_user)
    return UserResponse.model_validate(current_user)


@router.post("/profile/files", status_code=status.HTTP_201_CREATED)
async def upload_portfolio_file(
    file: UploadFile = File(...),
    title: str = Form(""),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Загрузка презентаций, каталогов и сертификатов в портфолио организации."""
    user_folder = os.path.join(UPLOAD_DIR, "portfolio", str(current_user.id))
    os.makedirs(user_folder, exist_ok=True)

    original_filename = file.filename or "portfolio_doc.bin"
    file_id = str(uuid.uuid4())[:8]
    clean_name = re.sub(r'[^a-zA-Z0-9_\-\.]', '_', original_filename)
    stored_filename = f"{file_id}_{clean_name}"
    file_path = os.path.join(user_folder, stored_filename)

    file_bytes = await file.read()
    with open(file_path, "wb") as f:
        f.write(file_bytes)

    download_url = f"/api/v1/auth/profile/files/{current_user.id}/{stored_filename}"

    portfolio = list(current_user.portfolio_files or [])
    portfolio_item = {
        "id": file_id,
        "name": title.strip() or original_filename,
        "filename": original_filename,
        "stored_filename": stored_filename,
        "path": file_path,
        "url": download_url,
        "size": len(file_bytes),
        "uploaded_at": datetime.now().strftime("%d.%m.%Y %H:%M"),
    }
    portfolio.append(portfolio_item)
    current_user.portfolio_files = portfolio

    await db.commit()
    await db.refresh(current_user)

    return {
        "success": True,
        "message": "Файл успешно добавлен в портфолио",
        "file": portfolio_item,
        "portfolio_files": current_user.portfolio_files,
    }


@router.delete("/profile/files/{file_id}")
async def delete_portfolio_file(
    file_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Удаляет файл из портфолио организации."""
    portfolio = list(current_user.portfolio_files or [])
    new_portfolio = []
    file_to_delete = None

    for item in portfolio:
        if str(item.get("id")) == str(file_id):
            file_to_delete = item
        else:
            new_portfolio.append(item)

    if not file_to_delete:
        raise HTTPException(status_code=404, detail="Файл портфолио не найден")

    # Удаляем физический файл с диска
    stored_path = file_to_delete.get("path")
    if stored_path and os.path.exists(stored_path):
        try:
            os.remove(stored_path)
        except Exception:
            pass

    current_user.portfolio_files = new_portfolio
    await db.commit()
    await db.refresh(current_user)

    return {
        "success": True,
        "message": "Файл удален из портфолио",
        "portfolio_files": current_user.portfolio_files,
    }


@router.get("/profile/files/{user_id}/{filename}")
async def download_portfolio_file(
    user_id: int,
    filename: str,
):
    """Публичное скачивание материалов портфолио организации."""
    clean_filename = os.path.basename(filename)
    file_path = os.path.join(UPLOAD_DIR, "portfolio", str(user_id), clean_filename)

    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Файл портфолио не найден на сервере")

    return FileResponse(file_path, filename=clean_filename)


@router.get("/public-profile/{user_id}", response_model=PublicUserProfileResponse)
async def get_public_profile(
    user_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Возвращает публичную карточку (досье) контрагента (НИИ или компании)."""
    user_res = await db.execute(select(User).where(User.id == user_id))
    user = user_res.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь или организация не найдена")

    # Подсчет статистики
    # 1. Завершенные проекты
    completed_res = await db.execute(
        select(func.count(Project.id)).where(
            or_(Project.investor_id == user.id, Project.lab_id == user.id),
            Project.status == "completed"
        )
    )
    completed_projects_count = completed_res.scalar() or 0

    # 2. Активные проекты
    active_res = await db.execute(
        select(func.count(Project.id)).where(
            or_(Project.investor_id == user.id, Project.lab_id == user.id),
            Project.status == "active"
        )
    )
    active_projects_count = active_res.scalar() or 0

    # 3. Разработки / идеи
    ideas_res = await db.execute(
        select(func.count(Idea.id)).where(Idea.author_id == user.id)
    )
    ideas_count = ideas_res.scalar() or 0

    # 4. Задачи
    tasks_res = await db.execute(
        select(func.count(Task.id)).where(Task.investor_id == user.id)
    )
    tasks_count = tasks_res.scalar() or 0

    return PublicUserProfileResponse(
        id=user.id,
        full_name=user.full_name,
        organization_name=user.organization_name,
        role=user.role,
        verification_status=user.verification_status,
        inn=user.inn,
        ogrn=user.ogrn,
        representative_name=user.representative_name,
        bio=user.bio,
        website_url=user.website_url,
        external_links=user.external_links or [],
        portfolio_files=user.portfolio_files or [],
        patents_info=user.patents_info or [],
        completed_projects_count=completed_projects_count,
        active_projects_count=active_projects_count,
        ideas_count=ideas_count,
        tasks_count=tasks_count,
        created_at=user.created_at,
    )


UPLOAD_DIR = os.environ.get("UPLOAD_DIR", "uploads")


def validate_inn_checksum(inn_str: str) -> tuple[bool, str, str]:
    inn = inn_str.strip()
    if not inn.isdigit():
        return False, "invalid", "ИНН должен состоять исключительно из цифр"
    digits = [int(c) for c in inn]
    if len(digits) == 10:
        coefficients = [2, 4, 10, 3, 5, 9, 4, 6, 8]
        control = sum(d * c for d, c in zip(digits[:9], coefficients)) % 11 % 10
        if control == digits[9]:
            return True, "legal_entity", "ИНН юридического лица (ФНС валидация пройдена)"
        return False, "invalid", "Неверная контрольная сумма 10-значного ИНН юрлица"
    elif len(digits) == 12:
        c1 = [7, 2, 4, 10, 3, 5, 9, 4, 6, 8]
        control1 = sum(d * c for d, c in zip(digits[:10], c1)) % 11 % 10
        c2 = [3, 7, 2, 4, 10, 3, 5, 9, 4, 6, 8]
        control2 = sum(d * c for d, c in zip(digits[:11], c2)) % 11 % 10
        if control1 == digits[10] and control2 == digits[11]:
            return True, "individual", "ИНН индивидуального предпринимателя / физлица (валиден)"
        return False, "invalid", "Неверная контрольная сумма 12-значного ИНН"
    return False, "invalid", "Длина ИНН должна быть ровно 10 цифр (для юрлиц) или 12 цифр (для ИП/физлиц)"


@router.get("/inn-lookup/{inn}")
async def lookup_inn(inn: str):
    """Проверяет корректность ИНН по контрольным коэффициентам ФНС РФ."""
    is_valid, inn_type, message = validate_inn_checksum(inn)
    return {
        "inn": inn,
        "is_valid": is_valid,
        "inn_type": inn_type,
        "message": message,
    }


@router.post("/documents/upload")
async def upload_user_document(
    file: UploadFile = File(...),
    doc_type: str = Form("statutory"),  # "statutory" or "patent"
    title: str = Form(""),
    patent_number: str = Form(""),
    patent_date: str = Form(""),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Загружает физический скан уставного документа или патента на сервер."""
    user_folder = os.path.join(UPLOAD_DIR, "users", str(current_user.id))
    os.makedirs(user_folder, exist_ok=True)

    original_filename = file.filename or "document.bin"
    timestamp = int(datetime.utcnow().timestamp())
    clean_name = re.sub(r'[^a-zA-Z0-9_\-\.]', '_', original_filename)
    stored_filename = f"{timestamp}_{clean_name}"
    file_path = os.path.join(user_folder, stored_filename)

    file_bytes = await file.read()
    with open(file_path, "wb") as f:
        f.write(file_bytes)

    download_url = f"/api/v1/auth/documents/{current_user.id}/{stored_filename}"

    if doc_type == "patent":
        patents = list(current_user.patents_info or [])
        new_patent = {
            "number": patent_number.strip() or f"RU {timestamp}",
            "title": title.strip() or original_filename,
            "date": patent_date.strip() or datetime.now().strftime("%d.%m.%Y"),
            "attachment_name": original_filename,
            "stored_filename": stored_filename,
            "file_url": download_url,
            "file_size": len(file_bytes),
        }
        patents.append(new_patent)
        current_user.patents_info = patents
    else:
        documents = list(current_user.documents or [])
        new_doc = {
            "name": title.strip() or original_filename,
            "type": "PDF скан с печатью" if original_filename.lower().endswith(".pdf") else "Документ",
            "status": "pending",
            "date": datetime.now().strftime("%d.%m.%Y"),
            "attachment_name": original_filename,
            "stored_filename": stored_filename,
            "file_url": download_url,
            "file_size": len(file_bytes),
        }
        documents.append(new_doc)
        current_user.documents = documents

    await db.commit()
    await db.refresh(current_user)

    return {
        "success": True,
        "message": "Документ успешно загружен и прикреплен к профилю",
        "doc_type": doc_type,
        "download_url": download_url,
        "user": UserResponse.model_validate(current_user),
    }


@router.get("/documents/{user_id}/{filename}")
async def download_user_document(
    user_id: int,
    filename: str,
    current_user: User = Depends(get_current_user),
):
    """Позволяет владельцу профиля или администратору скачать прикрепленный документ."""
    if current_user.id != user_id and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Доступ к документу запрещен")

    clean_filename = os.path.basename(filename)
    file_path = os.path.join(UPLOAD_DIR, "users", str(user_id), clean_filename)

    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Файл документа не найден на сервере")

    return FileResponse(file_path, filename=clean_filename)
