import os
import shutil
from datetime import datetime
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from fastapi.responses import FileResponse
from sqlalchemy import select, or_, func, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.models.project import Project, ProjectMilestone, ProjectFile, ProjectSyndicateMember
from app.models.finance import Account, Transaction, ProfitDistribution, ProfitPayoutItem
from app.models.notification import Notification
from app.models.chat import Chat, Message, ChatMember
from app.schemas.project import (
    ProjectResponse,
    MilestoneResponse,
    ProjectFileResponse,
    MilestoneReportRequest,
    GostReportGenerateRequest,
    SyndicateEnableRequest,
    SyndicateJoinRequest,
    SyndicateMemberResponse,
    SyndicateCapTableResponse,
    ProfitCalculatePreviewRequest,
    ProfitCalculatePreviewResponse,
    ProfitPreviewItemResponse,
    ProfitDistributeRequest,
    ProfitDistributionResponse,
    ProfitDistributionItemResponse,
)
from app.services.ai_service import generate_report_ai_summary
from app.services.gost_report_service import build_gost_docx, build_gost_pdf
from app.api.v1.endpoints.realtime import manager

router = APIRouter()

UPLOAD_DIR = os.environ.get("UPLOAD_DIR", "/app/uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)


async def _get_project_dto(project_id: int, db: AsyncSession) -> ProjectResponse:
    p_res = await db.execute(select(Project).where(Project.id == project_id))
    project = p_res.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Проект не найден")

    inv_res = await db.execute(select(User.full_name).where(User.id == project.investor_id))
    investor_name = inv_res.scalar_one_or_none()

    lab_res = await db.execute(select(User.full_name).where(User.id == project.lab_id))
    lab_name = lab_res.scalar_one_or_none()

    m_res = await db.execute(
        select(ProjectMilestone)
        .where(ProjectMilestone.project_id == project.id)
        .order_by(ProjectMilestone.step_number.asc())
    )
    milestones = [MilestoneResponse.model_validate(m) for m in m_res.scalars().all()]

    f_res = await db.execute(
        select(ProjectFile)
        .where(ProjectFile.project_id == project.id)
        .order_by(ProjectFile.uploaded_at.desc())
    )
    files = [ProjectFileResponse.model_validate(f) for f in f_res.scalars().all()]

    syn_res = await db.execute(
        select(
            func.coalesce(func.sum(ProjectSyndicateMember.invested_amount), Decimal("0.00")),
            func.count(ProjectSyndicateMember.id),
        ).where(ProjectSyndicateMember.project_id == project.id)
    )
    total_raised, members_count = syn_res.one()

    p_dto = ProjectResponse.model_validate(project)
    p_dto.investor_name = investor_name
    p_dto.lab_name = lab_name
    p_dto.milestones = milestones
    p_dto.files = files
    p_dto.syndication_total_raised = total_raised
    p_dto.syndicate_members_count = members_count
    return p_dto


@router.get("", response_model=list[ProjectResponse])
async def list_projects(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Проекты пользователя (как инвестор, лаборатория, соинвестор синдиката, либо открытые синдикаты для инвесторов)
    member_projects_subq = select(ProjectSyndicateMember.project_id).where(
        ProjectSyndicateMember.investor_id == current_user.id
    )

    query = (
        select(Project, User.full_name)
        .join(User, Project.lab_id == User.id)
        .where(
            or_(
                Project.investor_id == current_user.id,
                Project.lab_id == current_user.id,
                Project.id.in_(member_projects_subq),
                Project.is_syndicated.is_(True),
            )
        )
        .order_by(Project.id.desc())
    )
    result = await db.execute(query)
    rows = result.all()

    projects_list = []
    for project, lab_name in rows:
        dto = await _get_project_dto(project.id, db)
        projects_list.append(dto)

    return projects_list


@router.post("/{project_id}/milestones/{milestone_id}/fund", status_code=status.HTTP_200_OK)
async def fund_milestone(
    project_id: int,
    milestone_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Проверка прав (только инвестор проекта)
    p_res = await db.execute(select(Project).where(Project.id == project_id))
    project = p_res.scalar_one_or_none()
    if not project or project.investor_id != current_user.id:
        raise HTTPException(status_code=403, detail="Только инвестор может профинансировать этап")

    m_res = await db.execute(select(ProjectMilestone).where(ProjectMilestone.id == milestone_id, ProjectMilestone.project_id == project_id))
    milestone = m_res.scalar_one_or_none()
    if not milestone:
        raise HTTPException(status_code=404, detail="Этап не найден")

    if milestone.status != "pending_funds":
        raise HTTPException(status_code=400, detail="Этап уже профинансирован или закрыт")

    # Проверка баланса инвестора
    acc_res = await db.execute(select(Account).where(Account.user_id == current_user.id))
    account = acc_res.scalar_one_or_none()
    if not account or account.available_balance < milestone.amount:
        raise HTTPException(
            status_code=400,
            detail=f"Недостаточно средств на доступном балансе ({account.available_balance if account else 0} ₽). Требуется {milestone.amount} ₽. Пополните баланс.",
        )

    # Перевод с available на frozen (эскроу-резерв)
    account.available_balance -= milestone.amount
    account.frozen_balance += milestone.amount
    milestone.status = "escrow_funded"

    # Запись транзакции
    tx = Transaction(
        from_user_id=current_user.id,
        to_user_id=project.lab_id,
        project_id=project.id,
        amount=milestone.amount,
        type="escrow_lock",
        description=f"Блокировка средств в эскроу по этапу №{milestone.step_number}: {milestone.title}",
    )
    db.add(tx)
    await db.commit()
    return {"message": "Этап успешно профинансирован, средства заблокированы в эскроу-депозите"}


@router.post("/{project_id}/milestones/{milestone_id}/report", status_code=status.HTTP_200_OK)
async def submit_milestone_report(
    project_id: int,
    milestone_id: int,
    data: MilestoneReportRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    p_res = await db.execute(select(Project).where(Project.id == project_id))
    project = p_res.scalar_one_or_none()
    if not project or (project.lab_id != current_user.id and not current_user.is_admin):
        raise HTTPException(status_code=403, detail="Сдавать отчёт может только исполнитель (НИИ)")

    m_res = await db.execute(select(ProjectMilestone).where(ProjectMilestone.id == milestone_id, ProjectMilestone.project_id == project_id))
    milestone = m_res.scalar_one_or_none()
    if not milestone:
        raise HTTPException(status_code=404, detail="Этап не найден")

    # Генерация ИИ-сводки через реальную нейросеть
    try:
        ai_summary = await generate_report_ai_summary(data.raw_report, milestone.title)
    except Exception as e:
        ai_summary = f"• **Отчёт зарегистрирован**: {data.raw_report[:200]}...\n• **Статус ИИ-экспертизы**: Запрос передан на анализ ({str(e)})."

    milestone.raw_report = data.raw_report
    milestone.ai_summary = ai_summary
    milestone.status = "in_review"

    await db.commit()
    return {"message": "Отчёт успешно загружен и передан инвестору на согласование", "ai_summary": ai_summary}


@router.post("/{project_id}/milestones/{milestone_id}/approve", status_code=status.HTTP_200_OK)
async def approve_milestone(
    project_id: int,
    milestone_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    p_res = await db.execute(select(Project).where(Project.id == project_id))
    project = p_res.scalar_one_or_none()
    if not project or (project.investor_id != current_user.id and not current_user.is_admin):
        raise HTTPException(status_code=403, detail="Принять этап может только инвестор проекта")

    m_res = await db.execute(select(ProjectMilestone).where(ProjectMilestone.id == milestone_id, ProjectMilestone.project_id == project_id))
    milestone = m_res.scalar_one_or_none()
    if not milestone:
        raise HTTPException(status_code=404, detail="Этап не найден")

    if milestone.status != "in_review":
        raise HTTPException(status_code=400, detail="Этап не находится на проверке")

    # Списание с frozen_balance инвестора
    inv_acc_res = await db.execute(select(Account).where(Account.user_id == project.investor_id))
    inv_acc = inv_acc_res.scalar_one_or_none()
    if inv_acc:
        inv_acc.frozen_balance = max(Decimal("0.00"), inv_acc.frozen_balance - milestone.amount)

    # Зачисление 93% на счет НИИ, 7% комиссия платформы
    fee = milestone.amount * Decimal("0.07")
    net_payout = milestone.amount - fee

    lab_acc_res = await db.execute(select(Account).where(Account.user_id == project.lab_id))
    lab_acc = lab_acc_res.scalar_one_or_none()
    if not lab_acc:
        lab_acc = Account(user_id=project.lab_id, available_balance=Decimal("0.00"), frozen_balance=Decimal("0.00"))
        db.add(lab_acc)

    lab_acc.available_balance += net_payout
    milestone.status = "completed"

    # Запись транзакций
    db.add(Transaction(
        from_user_id=project.investor_id,
        to_user_id=project.lab_id,
        project_id=project.id,
        amount=net_payout,
        type="escrow_release",
        description=f"Выплата за выполненный этап №{milestone.step_number}: {milestone.title}",
    ))
    db.add(Transaction(
        from_user_id=project.investor_id,
        to_user_id=None,
        project_id=project.id,
        amount=fee,
        type="platform_fee",
        description=f"Комиссия платформы за сопровождение этапа №{milestone.step_number}",
    ))

    # Проверка: если все этапы завершены, закрываем проект
    all_m = await db.execute(select(ProjectMilestone).where(ProjectMilestone.project_id == project.id))
    if all(m.status == "completed" for m in all_m.scalars().all()):
        project.status = "completed"

    await db.commit()
    return {"message": f"Этап успешно принят. {net_payout} ₽ переведены на баланс исполнителя."}


@router.post("/{project_id}/milestones/{milestone_id}/dispute", status_code=status.HTTP_200_OK)
async def dispute_milestone(
    project_id: int,
    milestone_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    p_res = await db.execute(select(Project).where(Project.id == project_id))
    project = p_res.scalar_one_or_none()
    if not project or (project.investor_id != current_user.id and project.lab_id != current_user.id and not current_user.is_admin):
        raise HTTPException(status_code=403, detail="Доступ запрещён")

    m_res = await db.execute(select(ProjectMilestone).where(ProjectMilestone.id == milestone_id, ProjectMilestone.project_id == project_id))
    milestone = m_res.scalar_one_or_none()
    if not milestone:
        raise HTTPException(status_code=404, detail="Этап не найден")

    milestone.status = "disputed"
    project.status = "disputed"

    await db.commit()
    return {"message": "Спор успешно открыт. Дело передано кураторам платформы для арбитража."}


@router.post("/{project_id}/files", response_model=ProjectFileResponse, status_code=status.HTTP_201_CREATED)
async def upload_project_file(
    project_id: int,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    p_res = await db.execute(select(Project).where(Project.id == project_id))
    project = p_res.scalar_one_or_none()
    if not project or (project.investor_id != current_user.id and project.lab_id != current_user.id and not current_user.is_admin):
        raise HTTPException(status_code=403, detail="Вы не являетесь участником проекта")

    # Создаем папку для проекта
    project_folder = os.path.join(UPLOAD_DIR, f"project_{project_id}")
    os.makedirs(project_folder, exist_ok=True)

    file_name = file.filename or "file.bin"
    safe_name = f"{int(os.path.getmtime(project_folder))}_{file_name.replace(' ', '_')}"
    file_path = os.path.join(project_folder, safe_name)

    content = await file.read()
    with open(file_path, "wb") as f:
        f.write(content)

    proj_file = ProjectFile(
        project_id=project.id,
        uploader_id=current_user.id,
        file_name=file_name,
        file_path=file_path,
        file_size=len(content),
        mime_type=file.content_type or "application/octet-stream",
    )
    db.add(proj_file)
    await db.commit()
    await db.refresh(proj_file)
    return proj_file


@router.get("/{project_id}/files/{file_id}")
async def download_project_file(
    project_id: int,
    file_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    p_res = await db.execute(select(Project).where(Project.id == project_id))
    project = p_res.scalar_one_or_none()
    if not project or (project.investor_id != current_user.id and project.lab_id != current_user.id and not current_user.is_admin):
        raise HTTPException(status_code=403, detail="Доступ запрещён")

    f_res = await db.execute(select(ProjectFile).where(ProjectFile.id == file_id, ProjectFile.project_id == project_id))
    file_record = f_res.scalar_one_or_none()
    if not file_record:
        raise HTTPException(status_code=404, detail="Файл не найден")

    if not os.path.exists(file_record.file_path):
        raise HTTPException(status_code=404, detail="Файл отсутствует на диске")

    return FileResponse(
        path=file_record.file_path,
        filename=file_record.file_name,
        media_type=file_record.mime_type,
    )


# ==============================================================================
# СИНДИКАЦИЯ И СОФИНАНСИРОВАНИЕ (КЛУБНЫЕ СДЕЛКИ)
# ==============================================================================

@router.post("/{project_id}/syndicate/enable", response_model=ProjectResponse)
async def enable_syndication(
    project_id: int,
    data: SyndicateEnableRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Перевод сделки в формат синдицированного софинансирования (только для лид-инвестора)."""
    p_res = await db.execute(select(Project).where(Project.id == project_id))
    project = p_res.scalar_one_or_none()
    if not project or (project.investor_id != current_user.id and not current_user.is_admin):
        raise HTTPException(status_code=403, detail="Только инициатор проекта может открыть коллективное соинвестирование")

    project.is_syndicated = True
    project.syndication_min_deposit = data.syndication_min_deposit
    project.syndication_soft_cap = data.syndication_soft_cap
    project.syndication_status = "open"

    # Добавляем лид-инвестора в реестр соинвесторов, если его еще нет
    lead_res = await db.execute(
        select(ProjectSyndicateMember).where(
            ProjectSyndicateMember.project_id == project.id,
            ProjectSyndicateMember.investor_id == current_user.id,
        )
    )
    lead_member = lead_res.scalar_one_or_none()
    if not lead_member:
        lead_member = ProjectSyndicateMember(
            project_id=project.id,
            investor_id=current_user.id,
            invested_amount=Decimal("0.00"),
            share_percent=Decimal("0.00"),
            is_lead=True,
            ip_share_type="patent_co_owner",
        )
        db.add(lead_member)

    await db.commit()
    return await _get_project_dto(project.id, db)


@router.post("/{project_id}/syndicate/join", status_code=status.HTTP_200_OK)
async def join_syndicate(
    project_id: int,
    data: SyndicateJoinRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Внесение средств на эскроу-счёт синдиката и получение доли в РИД / роялти."""
    p_res = await db.execute(select(Project).where(Project.id == project_id))
    project = p_res.scalar_one_or_none()
    if not project or not project.is_syndicated:
        raise HTTPException(status_code=400, detail="Сделка не переведена в формат коллективного соинвестирования")

    if project.syndication_status != "open":
        raise HTTPException(status_code=400, detail="Сбор софинансирования закрыт")

    if project.lab_id == current_user.id:
        raise HTTPException(status_code=400, detail="Исполнитель проекта (НИИ) не может выступать инвестором своего проекта")

    if project.investor_id == current_user.id:
        raise HTTPException(status_code=400, detail="Инициатор проекта не может соинвестировать в собственный проект")

    if project.syndication_min_deposit > 0 and data.amount < project.syndication_min_deposit:
        raise HTTPException(
            status_code=400,
            detail=f"Минимальный взнос в данный проект составляет {project.syndication_min_deposit:,.2f} ₽",
        )

    # Проверка баланса инвестора
    acc_res = await db.execute(select(Account).where(Account.user_id == current_user.id))
    account = acc_res.scalar_one_or_none()
    if not account or account.available_balance < data.amount:
        raise HTTPException(
            status_code=400,
            detail=f"Недостаточно доступных средств на счёте. Требуется {data.amount:,.2f} ₽, доступно {account.available_balance if account else 0:,.2f} ₽",
        )

    # 1. Заморозка на эскроу
    account.available_balance -= data.amount
    account.frozen_balance += data.amount

    tx = Transaction(
        account_id=account.id,
        type="escrow_freeze",
        amount=data.amount,
        status="completed",
        description=f"Взнос соинвестора в проект #{project.id}: «{project.title}»",
    )
    db.add(tx)

    # 2. Добавление или пополнение взноса участника
    mem_res = await db.execute(
        select(ProjectSyndicateMember).where(
            ProjectSyndicateMember.project_id == project.id,
            ProjectSyndicateMember.investor_id == current_user.id,
        )
    )
    member = mem_res.scalar_one_or_none()
    if member:
        member.invested_amount += data.amount
        member.ip_share_type = data.ip_share_type
    else:
        member = ProjectSyndicateMember(
            project_id=project.id,
            investor_id=current_user.id,
            invested_amount=data.amount,
            share_percent=Decimal("0.00"),
            is_lead=(project.investor_id == current_user.id),
            ip_share_type=data.ip_share_type,
        )
        db.add(member)

    await db.flush()

    # 3. Атомарный пересчет долей всех соинвесторов
    all_members_res = await db.execute(
        select(ProjectSyndicateMember).where(ProjectSyndicateMember.project_id == project.id)
    )
    all_members = all_members_res.scalars().all()
    total_raised = sum((m.invested_amount for m in all_members), Decimal("0.00"))

    target_budget = project.syndication_soft_cap if project.syndication_soft_cap > 0 else (project.total_budget or Decimal("1.00"))
    base_pool = max(target_budget, total_raised)

    if base_pool > 0:
        for m in all_members:
            m.share_percent = round((m.invested_amount / base_pool) * Decimal("100.00"), 2)

    # 4. Проверка выполнения Soft Cap
    if project.syndication_soft_cap > 0 and total_raised >= project.syndication_soft_cap:
        project.syndication_status = "funded"

    # 5. Автоматическая синхронизация с групповым чатом проекта
    c_res = await db.execute(
        select(Chat).where(and_(Chat.project_id == project.id, Chat.chat_type == "project"))
    )
    chat = c_res.scalars().first()
    if not chat:
        chat = Chat(
            chat_type="project",
            project_id=project.id,
            investor_id=project.investor_id,
            lab_id=project.lab_id,
            title=f"Группа: {project.title}",
            context_type="project",
            context_id=project.id,
        )
        db.add(chat)
        await db.flush()

    # Проверяем членство в чате
    cm_res = await db.execute(
        select(ChatMember).where(
            and_(ChatMember.chat_id == chat.id, ChatMember.user_id == current_user.id)
        )
    )
    c_member = cm_res.scalar_one_or_none()
    if not c_member:
        c_member = ChatMember(
            chat_id=chat.id,
            user_id=current_user.id,
            role="lead_investor" if member.is_lead else "co_investor",
        )
        db.add(c_member)

    # Системное сообщение в групповой чат
    inv_label = current_user.organization_name or current_user.full_name or "Инвестор"
    sys_msg = Message(
        chat_id=chat.id,
        sender_id=current_user.id,
        content=f"👋 {inv_label} вошёл в коллективное соинвестирование проекта со взносом {data.amount:,.2f} ₽ (доля в проекте: {member.share_percent}%).",
        is_read=False,
        is_system=True,
    )
    db.add(sys_msg)

    # Уведомление лид-инвестору
    if project.investor_id != current_user.id:
        notif = Notification(
            recipient_id=project.investor_id,
            type="syndicate_joined",
            title="Новый взнос в проект",
            body=f"{current_user.organization_name or current_user.full_name} внёс {data.amount:,.2f} ₽ в проект #{project.id}.",
            link_url="/dashboard?tab=projects",
            severity="success",
        )
        db.add(notif)

    await db.commit()

    try:
        await manager.broadcast_chat(chat.id, {
            "type": "message",
            "id": sys_msg.id,
            "chat_id": chat.id,
            "sender_id": current_user.id,
            "sender_name": "Система",
            "sender_role": "system",
            "content": sys_msg.content,
            "is_system": True,
            "attachments": [],
            "created_at": sys_msg.created_at.isoformat() if sys_msg.created_at else None,
            "is_mine": False,
        })
    except Exception:
        pass

    return {
        "success": True,
        "invested_amount": member.invested_amount,
        "share_percent": member.share_percent,
        "total_raised": total_raised,
        "syndication_status": project.syndication_status,
    }


@router.get("/{project_id}/syndicate/cap-table", response_model=SyndicateCapTableResponse)
async def get_syndicate_cap_table(
    project_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Получение Cap Table (реестра долей соинвесторов) и прогресса синдиката."""
    p_res = await db.execute(select(Project).where(Project.id == project_id))
    project = p_res.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Проект не найден")

    mem_res = await db.execute(
        select(ProjectSyndicateMember, User.full_name, User.organization_name)
        .join(User, ProjectSyndicateMember.investor_id == User.id)
        .where(ProjectSyndicateMember.project_id == project.id)
        .order_by(ProjectSyndicateMember.is_lead.desc(), ProjectSyndicateMember.invested_amount.desc())
    )
    rows = mem_res.all()

    members_dto = []
    total_raised = Decimal("0.00")
    current_share = Decimal("0.00")
    current_invested = Decimal("0.00")

    for member, full_name, org_name in rows:
        total_raised += member.invested_amount
        if member.investor_id == current_user.id:
            current_share = member.share_percent
            current_invested = member.invested_amount

        dto = SyndicateMemberResponse(
            id=member.id,
            project_id=member.project_id,
            investor_id=member.investor_id,
            investor_name=full_name,
            organization_name=org_name,
            invested_amount=member.invested_amount,
            share_percent=member.share_percent,
            is_lead=member.is_lead,
            ip_share_type=member.ip_share_type,
            joined_at=member.joined_at,
        )
        members_dto.append(dto)

    soft_cap = project.syndication_soft_cap if project.syndication_soft_cap > 0 else project.total_budget
    progress = float(min(Decimal("100.0"), (total_raised / soft_cap * Decimal("100.0")))) if soft_cap > 0 else 0.0

    return SyndicateCapTableResponse(
        project_id=project.id,
        project_title=project.title,
        total_budget=project.total_budget,
        soft_cap=project.syndication_soft_cap,
        min_deposit=project.syndication_min_deposit,
        total_raised=total_raised,
        progress_percent=round(progress, 1),
        syndication_status=project.syndication_status,
        is_lead=(project.investor_id == current_user.id),
        current_user_share=current_share,
        current_user_invested=current_invested,
        members=members_dto,
    )


@router.post("/{project_id}/syndicate/leave", status_code=status.HTTP_200_OK)
async def leave_syndicate(
    project_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Выход соинвестора из открытого синдиката с полным возвратом эскроу-депозита."""
    p_res = await db.execute(select(Project).where(Project.id == project_id))
    project = p_res.scalar_one_or_none()
    if not project or not project.is_syndicated:
        raise HTTPException(status_code=400, detail="Сделка не в формате коллективного соинвестирования")

    if project.investor_id == current_user.id:
        raise HTTPException(status_code=400, detail="Инициатор проекта не может выйти из проекта. Отмените проект или передайте управление.")

    if project.syndication_status != "open":
        raise HTTPException(status_code=400, detail="Нельзя отозвать взнос: Soft Cap уже достигнут, работы запущены.")

    mem_res = await db.execute(
        select(ProjectSyndicateMember).where(
            ProjectSyndicateMember.project_id == project.id,
            ProjectSyndicateMember.investor_id == current_user.id,
        )
    )
    member = mem_res.scalar_one_or_none()
    if not member or member.invested_amount <= 0:
        raise HTTPException(status_code=404, detail="Вы не являетесь соинвестором этого проекта")

    refund_amount = member.invested_amount

    # Возврат эскроу на доступный баланс инвестора
    acc_res = await db.execute(select(Account).where(Account.user_id == current_user.id))
    account = acc_res.scalar_one_or_none()
    if account:
        account.frozen_balance = max(Decimal("0.00"), account.frozen_balance - refund_amount)
        account.available_balance += refund_amount

        tx = Transaction(
            account_id=account.id,
            type="escrow_refund",
            amount=refund_amount,
            status="completed",
            description=f"Возврат средств при выходе из проекта #{project.id}: «{project.title}»",
        )
        db.add(tx)

    await db.delete(member)
    await db.flush()

    # Пересчёт долей оставшихся участников
    all_members_res = await db.execute(
        select(ProjectSyndicateMember).where(ProjectSyndicateMember.project_id == project.id)
    )
    all_members = all_members_res.scalars().all()
    total_raised = sum((m.invested_amount for m in all_members), Decimal("0.00"))
    target_budget = project.syndication_soft_cap if project.syndication_soft_cap > 0 else (project.total_budget or Decimal("1.00"))
    base_pool = max(target_budget, total_raised)

    if base_pool > 0:
        for m in all_members:
            m.share_percent = round((m.invested_amount / base_pool) * Decimal("100.00"), 2)

    # Удаление из участников группового чата проекта
    c_res = await db.execute(
        select(Chat).where(and_(Chat.project_id == project.id, Chat.chat_type == "project"))
    )
    chat = c_res.scalars().first()
    sys_msg = None
    if chat:
        cm_res = await db.execute(
            select(ChatMember).where(
                and_(ChatMember.chat_id == chat.id, ChatMember.user_id == current_user.id)
            )
        )
        c_mem = cm_res.scalar_one_or_none()
        if c_mem:
            await db.delete(c_mem)

        inv_label = current_user.organization_name or current_user.full_name or "Инвестор"
        sys_msg = Message(
            chat_id=chat.id,
            sender_id=current_user.id,
            content=f"🚪 {inv_label} отозвал инвестиционный взнос и покинул проект.",
            is_read=False,
            is_system=True,
        )
        db.add(sys_msg)

    await db.commit()

    if chat and sys_msg:
        try:
            await manager.broadcast_chat(chat.id, {
                "type": "message",
                "id": sys_msg.id,
                "chat_id": chat.id,
                "sender_id": current_user.id,
                "sender_name": "Система",
                "sender_role": "system",
                "content": sys_msg.content,
                "is_system": True,
                "attachments": [],
                "created_at": sys_msg.created_at.isoformat() if sys_msg.created_at else None,
                "is_mine": False,
            })
        except Exception:
            pass

    return {"success": True, "refunded_amount": refund_amount}


@router.post("/{project_id}/milestones/{milestone_id}/generate-gost-report")
async def generate_gost_report(
    project_id: int,
    milestone_id: int,
    data: GostReportGenerateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Генерирует официальный отчёт по ГОСТ 7.32-2017 в форматах DOCX и PDF для сдачи этапа НИОКР.
    """
    p_res = await db.execute(select(Project).where(Project.id == project_id))
    project = p_res.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Проект не найден")

    # Только исполнитель (НИИ) или админ могут генерировать отчет сдачи
    if current_user.id != project.lab_id and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Генерация отчета доступна только исполнителю (НИИ) или администратору")

    m_res = await db.execute(
        select(ProjectMilestone).where(
            ProjectMilestone.id == milestone_id,
            ProjectMilestone.project_id == project_id,
        )
    )
    milestone = m_res.scalar_one_or_none()
    if not milestone:
        raise HTTPException(status_code=404, detail="Этап не найден")

    # Получаем данные сторон
    lab_res = await db.execute(select(User).where(User.id == project.lab_id))
    lab_user = lab_res.scalar_one_or_none()
    inv_res = await db.execute(select(User).where(User.id == project.investor_id))
    inv_user = inv_res.scalar_one_or_none()

    lab_org = (lab_user.organization_name or lab_user.full_name) if lab_user else "Научно-исследовательская организация"
    lab_rep = (lab_user.representative_name or lab_user.full_name) if lab_user else "Руководитель НИИ"
    inv_org = (inv_user.organization_name or inv_user.full_name) if inv_user else "Заказчик"
    inv_rep = (inv_user.representative_name or inv_user.full_name) if inv_user else "Представитель заказчика"

    folder = os.path.join(UPLOAD_DIR, "gost_reports", f"proj_{project_id}_ms_{milestone_id}")
    os.makedirs(folder, exist_ok=True)

    docx_path = os.path.join(folder, f"GOST_7.32_Report_Stage_{milestone.step_number}.docx")
    pdf_path = os.path.join(folder, f"GOST_7.32_Report_Stage_{milestone.step_number}.pdf")

    # Генерация DOCX по ГОСТ
    build_gost_docx(
        output_path=docx_path,
        project_title=project.title,
        milestone_step=milestone.step_number,
        milestone_title=milestone.title,
        lab_org_name=lab_org,
        lab_rep_name=lab_rep,
        investor_org_name=inv_org,
        investor_rep_name=inv_rep,
        executors=data.executors,
        abstract_text=data.abstract_text,
        intro_text=data.intro_text,
        main_research_text=data.main_research_text,
        conclusion_text=data.conclusion_text,
        references=data.references,
    )

    # Генерация PDF по ГОСТ
    build_gost_pdf(
        output_path=pdf_path,
        project_title=project.title,
        milestone_step=milestone.step_number,
        milestone_title=milestone.title,
        lab_org_name=lab_org,
        lab_rep_name=lab_rep,
        investor_org_name=inv_org,
        investor_rep_name=inv_rep,
        executors=data.executors,
        abstract_text=data.abstract_text,
        intro_text=data.intro_text,
        main_research_text=data.main_research_text,
        conclusion_text=data.conclusion_text,
        references=data.references,
    )

    # Сохраняем в БД
    gost_data = {
        "executors": data.executors,
        "abstract_text": data.abstract_text,
        "intro_text": data.intro_text,
        "main_research_text": data.main_research_text,
        "conclusion_text": data.conclusion_text,
        "references": data.references,
        "generated_at": datetime.utcnow().isoformat(),
    }
    milestone.gost_structured_data = gost_data
    milestone.gost_docx_path = docx_path
    milestone.gost_pdf_path = pdf_path
    milestone.raw_report = data.main_research_text[:2000]

    # Если статус был pending_funds или escrow_funded, переводим в in_review
    if milestone.status in ["escrow_funded", "pending_funds"]:
        milestone.status = "in_review"

    await db.commit()
    await db.refresh(milestone)

    return {
        "success": True,
        "message": "Отчёт о НИР по ГОСТ 7.32-2017 успешно сформирован",
        "milestone": MilestoneResponse.model_validate(milestone),
        "docx_download_url": f"/api/v1/projects/{project_id}/milestones/{milestone_id}/gost-download?format=docx",
        "pdf_download_url": f"/api/v1/projects/{project_id}/milestones/{milestone_id}/gost-download?format=pdf",
    }


@router.get("/{project_id}/milestones/{milestone_id}/gost-download")
async def download_gost_report(
    project_id: int,
    milestone_id: int,
    format: str = "pdf",  # "pdf" or "docx"
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Скачивание сгенерированного отчета ГОСТ 7.32. Доступно заказчику, исполнителю и админам (арбитраж).
    """
    p_res = await db.execute(select(Project).where(Project.id == project_id))
    project = p_res.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Проект не найден")

    # Проверка прав доступа: заказчик, исполнитель или администратор
    is_party = (current_user.id in [project.investor_id, project.lab_id])
    if not is_party and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Доступ к отчетам закрытого проекта разрешен только сторонам сделки или арбитражу")

    m_res = await db.execute(
        select(ProjectMilestone).where(
            ProjectMilestone.id == milestone_id,
            ProjectMilestone.project_id == project_id,
        )
    )
    milestone = m_res.scalar_one_or_none()
    if not milestone:
        raise HTTPException(status_code=404, detail="Этап не найден")

    file_path = milestone.gost_docx_path if format.lower() == "docx" else milestone.gost_pdf_path
    if not file_path or not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail=f"Отчёт в формате {format.upper()} ещё не был сгенерирован")

    ext = "docx" if format.lower() == "docx" else "pdf"
    media_type = "application/vnd.openxmlformats-officedocument.wordprocessingml.document" if ext == "docx" else "application/pdf"
    download_name = f"GOST_Report_Project_{project_id}_Stage_{milestone.step_number}.{ext}"

    return FileResponse(file_path, media_type=media_type, filename=download_name)



# ==============================================================================
# Распределение прибыли по проекту (Profit Share Distribution)
# ==============================================================================

@router.post("/{project_id}/profit/calculate-preview", response_model=ProfitCalculatePreviewResponse)
async def calculate_profit_preview(
    project_id: int,
    data: ProfitCalculatePreviewRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Рассчитывает предварительную таблицу пропорционального распределения прибыли между соинвесторами.
    Доступно исполнителю (Лаборатории/НИИ) или Администратору платформы.
    """
    p_res = await db.execute(select(Project).where(Project.id == project_id))
    project = p_res.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Проект не найден")

    if project.lab_id != current_user.id and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Только исполнитель проекта (Лаборатория) или Администратор могут рассчитывать распределение прибыли")

    if data.amount <= 0:
        raise HTTPException(status_code=400, detail="Сумма прибыли должна быть положительным числом")

    # Получаем всех участников синдиката с положительными вложениями
    mem_res = await db.execute(
        select(ProjectSyndicateMember, User)
        .join(User, ProjectSyndicateMember.investor_id == User.id)
        .where(
            and_(
                ProjectSyndicateMember.project_id == project.id,
                ProjectSyndicateMember.invested_amount > 0,
            )
        )
        .order_by(ProjectSyndicateMember.invested_amount.desc())
    )
    rows = mem_res.all()

    # Если синдикат не зарегистрирован, проверяем прямого инвестора
    if not rows and project.investor_id:
        inv_res = await db.execute(select(User).where(User.id == project.investor_id))
        inv_user = inv_res.scalar_one_or_none()
        if inv_user:
            return ProfitCalculatePreviewResponse(
                project_id=project.id,
                project_title=project.title,
                total_profit=data.amount,
                total_invested=project.total_budget,
                investors_count=1,
                items=[
                    ProfitPreviewItemResponse(
                        investor_id=inv_user.id,
                        investor_name=inv_user.full_name or inv_user.organization_name,
                        organization_name=inv_user.organization_name,
                        invested_amount=project.total_budget,
                        share_percent=Decimal("100.0000"),
                        payout_amount=data.amount,
                    )
                ],
            )

    if not rows:
        return ProfitCalculatePreviewResponse(
            project_id=project.id,
            project_title=project.title,
            total_profit=data.amount,
            total_invested=Decimal("0.00"),
            investors_count=0,
            items=[],
        )

    total_invested = sum((m.invested_amount for m, _ in rows), Decimal("0.00"))
    if total_invested <= 0:
        raise HTTPException(status_code=400, detail="Сумма инвестиций в проект равна нулю")

    items = []
    allocated_total = Decimal("0.00")

    for m, user in rows:
        share_ratio = m.invested_amount / total_invested
        share_percent = round(share_ratio * Decimal("100.0000"), 4)
        payout = round(data.amount * share_ratio, 2)
        allocated_total += payout

        items.append(
            ProfitPreviewItemResponse(
                investor_id=user.id,
                investor_name=user.full_name or user.organization_name,
                organization_name=user.organization_name,
                invested_amount=m.invested_amount,
                share_percent=share_percent,
                payout_amount=payout,
            )
        )

    # Коррекция копеечного округления на наибольшего инвестора
    cents_diff = data.amount - allocated_total
    if cents_diff != Decimal("0.00") and items:
        items[0].payout_amount += cents_diff

    return ProfitCalculatePreviewResponse(
        project_id=project.id,
        project_title=project.title,
        total_profit=data.amount,
        total_invested=total_invested,
        investors_count=len(items),
        items=items,
    )


@router.post("/{project_id}/profit/distribute", response_model=ProfitDistributionResponse)
async def distribute_profit(
    project_id: int,
    data: ProfitDistributeRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Выполняет фактическое начисление прибыли/дивидендов на баланс соинвесторов пропорционально их долям.
    Доступно исполнителю (Лаборатории/НИИ) или Администратору платформы.
    """
    p_res = await db.execute(select(Project).where(Project.id == project_id))
    project = p_res.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Проект не найден")

    if project.lab_id != current_user.id and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Только исполнитель проекта (Лаборатория) или Администратор могут производить распределение прибыли")

    if data.amount <= 0:
        raise HTTPException(status_code=400, detail="Сумма прибыли должна быть больше нуля")

    # Получаем участников синдиката
    mem_res = await db.execute(
        select(ProjectSyndicateMember, User)
        .join(User, ProjectSyndicateMember.investor_id == User.id)
        .where(
            and_(
                ProjectSyndicateMember.project_id == project.id,
                ProjectSyndicateMember.invested_amount > 0,
            )
        )
        .order_by(ProjectSyndicateMember.invested_amount.desc())
    )
    rows = mem_res.all()

    # Если синдикат пуст, но есть одиночный инвестор
    if not rows and project.investor_id:
        inv_res = await db.execute(select(User).where(User.id == project.investor_id))
        inv_user = inv_res.scalar_one_or_none()
        if inv_user:
            rows = [(None, inv_user)]

    if not rows:
        raise HTTPException(status_code=400, detail="В проекте нет инвесторов для выплаты прибыли")

    total_invested = sum((m.invested_amount for m, _ in rows if m), Decimal("0.00")) or project.total_budget
    if total_invested <= 0:
        total_invested = Decimal("1.00")

    # 1. Создаем мастер-запись распределения прибыли
    distribution = ProfitDistribution(
        project_id=project.id,
        initiator_id=current_user.id,
        total_amount=data.amount,
        description=data.description.strip(),
        status="completed",
    )
    db.add(distribution)
    await db.flush()

    # 2. Рассчитываем и зачисляем суммы каждому инвестору
    allocated_total = Decimal("0.00")
    items_to_save = []

    for m, user in rows:
        invested = m.invested_amount if m else project.total_budget
        share_ratio = invested / total_invested
        share_percent = round(share_ratio * Decimal("100.0000"), 4)
        payout = round(data.amount * share_ratio, 2)
        allocated_total += payout

        items_to_save.append({
            "user": user,
            "invested_amount": invested,
            "share_percent": share_percent,
            "payout_amount": payout,
        })

    # Коррекция копеечного округления
    cents_diff = data.amount - allocated_total
    if cents_diff != Decimal("0.00") and items_to_save:
        items_to_save[0]["payout_amount"] += cents_diff

    # 3. Финансовые проводки и начисление на кошельки
    payout_dtos = []
    for item in items_to_save:
        target_user = item["user"]
        payout_amt = item["payout_amount"]

        # Пополнение счета инвестора
        acc_res = await db.execute(select(Account).where(Account.user_id == target_user.id))
        account = acc_res.scalar_one_or_none()
        if not account:
            account = Account(
                user_id=target_user.id,
                available_balance=Decimal("0.00"),
                frozen_balance=Decimal("0.00"),
            )
            db.add(account)
            await db.flush()

        account.available_balance += payout_amt

        # Запись транзакции
        tx = Transaction(
            from_user_id=current_user.id,
            to_user_id=target_user.id,
            project_id=project.id,
            amount=payout_amt,
            type="profit_payout",
            status="completed",
            description=f"Начисление инвестиционного дохода по проекту «{project.title}»: {data.description}",
        )
        db.add(tx)
        await db.flush()

        # Элемент распределения
        payout_item = ProfitPayoutItem(
            distribution_id=distribution.id,
            investor_id=target_user.id,
            invested_amount=item["invested_amount"],
            share_percent=item["share_percent"],
            payout_amount=payout_amt,
            transaction_id=tx.id,
        )
        db.add(payout_item)
        await db.flush()

        # Уведомление в колокольчик
        notif = Notification(
            recipient_id=target_user.id,
            type="profit_payout",
            title="💰 Начисление прибыли по проекту",
            body=f"Вам зачислено {payout_amt:,.2f} ₽ (доля {item['share_percent']}%) по проекту «{project.title}».",
            link_url="/dashboard?tab=finances",
            severity="success",
        )
        db.add(notif)

        payout_dtos.append(
            ProfitDistributionItemResponse(
                id=payout_item.id,
                investor_id=target_user.id,
                investor_name=target_user.full_name or target_user.organization_name,
                organization_name=target_user.organization_name,
                invested_amount=item["invested_amount"],
                share_percent=item["share_percent"],
                payout_amount=payout_amt,
                transaction_id=tx.id,
            )
        )

    # 4. Системное сообщение в групповой чат проекта
    c_res = await db.execute(
        select(Chat).where(and_(Chat.project_id == project.id, Chat.chat_type == "project"))
    )
    chat = c_res.scalars().first()
    if chat:
        sys_msg = Message(
            chat_id=chat.id,
            sender_id=current_user.id,
            content=f"💸 Произведено распределение прибыли по проекту: общая сумма {data.amount:,.2f} ₽ выплачена инвесторам пропорционально долям. Основание: {data.description}",
            is_read=False,
            is_system=True,
        )
        db.add(sys_msg)

    await db.commit()

    if chat:
        try:
            await manager.broadcast_chat(chat.id, {
                "type": "message",
                "id": sys_msg.id,
                "chat_id": chat.id,
                "sender_id": current_user.id,
                "sender_name": "Финансовый шлюз",
                "sender_role": "system",
                "content": sys_msg.content,
                "is_system": True,
                "attachments": [],
                "created_at": sys_msg.created_at.isoformat() if sys_msg.created_at else None,
                "is_mine": False,
            })
        except Exception:
            pass

    return ProfitDistributionResponse(
        id=distribution.id,
        project_id=project.id,
        initiator_id=current_user.id,
        initiator_name=current_user.full_name or current_user.organization_name,
        total_amount=distribution.total_amount,
        distribution_date=distribution.distribution_date,
        description=distribution.description,
        status=distribution.status,
        items=payout_dtos,
    )


@router.get("/{project_id}/profit/history", response_model=list[ProfitDistributionResponse])
async def get_profit_distribution_history(
    project_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Возвращает историю всех распределений прибыли по проекту.
    Доступно сторонам проекта (лаборатория, лид-инвестор, соинвесторы) и администратору.
    """
    p_res = await db.execute(select(Project).where(Project.id == project_id))
    project = p_res.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Проект не найден")

    # Проверка доступа к истории
    is_allowed = False
    if current_user.is_admin or project.lab_id == current_user.id or project.investor_id == current_user.id:
        is_allowed = True
    else:
        sm_res = await db.execute(
            select(ProjectSyndicateMember.id).where(
                and_(
                    ProjectSyndicateMember.project_id == project.id,
                    ProjectSyndicateMember.investor_id == current_user.id,
                    ProjectSyndicateMember.invested_amount > 0,
                )
            )
        )
        if sm_res.scalar_one_or_none():
            is_allowed = True

    if not is_allowed:
        raise HTTPException(status_code=403, detail="Доступ к истории финансовых выплат проекта запрещён")

    d_res = await db.execute(
        select(ProfitDistribution, User.full_name)
        .join(User, ProfitDistribution.initiator_id == User.id)
        .where(ProfitDistribution.project_id == project.id)
        .order_by(ProfitDistribution.distribution_date.desc())
    )
    dist_rows = d_res.all()

    response = []
    for dist, init_name in dist_rows:
        items_res = await db.execute(
            select(ProfitPayoutItem, User.full_name, User.organization_name)
            .join(User, ProfitPayoutItem.investor_id == User.id)
            .where(ProfitPayoutItem.distribution_id == dist.id)
            .order_by(ProfitPayoutItem.payout_amount.desc())
        )
        item_rows = items_res.all()

        item_dtos = [
            ProfitDistributionItemResponse(
                id=item.id,
                investor_id=item.investor_id,
                investor_name=user_name or org_name or "Инвестор",
                organization_name=org_name,
                invested_amount=item.invested_amount,
                share_percent=item.share_percent,
                payout_amount=item.payout_amount,
                transaction_id=item.transaction_id,
            )
            for item, user_name, org_name in item_rows
        ]

        response.append(
            ProfitDistributionResponse(
                id=dist.id,
                project_id=dist.project_id,
                initiator_id=dist.initiator_id,
                initiator_name=init_name,
                total_amount=dist.total_amount,
                distribution_date=dist.distribution_date,
                description=dist.description,
                status=dist.status,
                items=item_dtos,
            )
        )

    return response
