from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.models.task import Task, TaskBid
from app.models.project import Project, ProjectMilestone
from app.models.chat import Chat, Message
from app.models.matching import MatchingInvitation
from app.schemas.task import TaskCreateRequest, TaskUpdateRequest, TaskBidCreateRequest, TaskResponse, TaskBidResponse
from app.services.chat_service import get_or_create_context_chat
from app.services.matching_service import run_task_matchmaking
from app.services.certificate_service import get_or_create_deposit_certificate

router = APIRouter()


@router.get("", response_model=list[TaskResponse])
async def list_tasks(
    db: AsyncSession = Depends(get_db),
    current_user: User | None = Depends(get_current_user),
):
    query = (
        select(Task, User.full_name)
        .join(User, Task.investor_id == User.id)
        .order_by(Task.id.desc())
    )
    result = await db.execute(query)
    tasks_with_users = result.all()

    response = []
    for task, investor_name in tasks_with_users:
        # Получаем отклики
        bids_res = await db.execute(
            select(TaskBid, User.full_name, User.organization_name)
            .join(User, TaskBid.lab_id == User.id)
            .where(TaskBid.task_id == task.id)
            .order_by(TaskBid.id.desc())
        )
        bids_rows = bids_res.all()

        bids_list = []
        for bid, lab_name, org_name in bids_rows:
            bid_dto = TaskBidResponse.model_validate(bid)
            bid_dto.lab_name = lab_name
            bid_dto.organization_name = org_name
            bids_list.append(bid_dto)

        t_res = TaskResponse.model_validate(task)
        t_res.investor_name = investor_name
        t_res.milestones = task.milestones or []
        t_res.bids_count = len(bids_list)
        t_res.bids = bids_list
        response.append(t_res)

    return response


@router.post("", response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
async def create_task(
    data: TaskCreateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    task = Task(
        investor_id=current_user.id,
        title=data.title.strip(),
        description=data.description.strip(),
        budget=data.budget,
        deadline=data.deadline.strip(),
        milestones=data.milestones,
        moderation_status="approved",
        status="open",
    )
    db.add(task)
    await db.commit()
    await db.refresh(task)

    # 1. Формирование цифрового свидетельства депонирования ТЗ
    try:
        await get_or_create_deposit_certificate(db, "task", task.id)
    except Exception as e:
        print(f"[TASK CREATE] Certificate warning: {e}")

    # 2. Запуск AI Matchmaking (подбор Топ-3 НИИ)
    try:
        await run_task_matchmaking(db, task.id)
    except Exception as e:
        print(f"[TASK CREATE] Matchmaking warning: {e}")

    res = TaskResponse.model_validate(task)
    res.investor_name = current_user.full_name
    res.bids_count = 0
    res.bids = []
    return res


@router.get("/{task_id}", response_model=TaskResponse)
async def get_task(
    task_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User | None = Depends(get_current_user),
):
    """Получение детальной информации о задаче/тендере по ее ID."""
    res = await db.execute(select(Task, User.full_name).join(User, Task.investor_id == User.id).where(Task.id == task_id))
    row = res.first()
    if not row:
        raise HTTPException(status_code=404, detail="Задача не найдена")

    task, investor_name = row

    bids_res = await db.execute(
        select(TaskBid, User.full_name, User.organization_name)
        .join(User, TaskBid.lab_id == User.id)
        .where(TaskBid.task_id == task.id)
        .order_by(TaskBid.id.desc())
    )
    bids_rows = bids_res.all()

    bids_list = []
    for bid, lab_name, org_name in bids_rows:
        bid_dto = TaskBidResponse.model_validate(bid)
        bid_dto.lab_name = lab_name
        bid_dto.organization_name = org_name
        bids_list.append(bid_dto)

    t_res = TaskResponse.model_validate(task)
    t_res.investor_name = investor_name
    t_res.bids_count = len(bids_list)
    t_res.bids = bids_list
    return t_res


@router.put("/{task_id}", response_model=TaskResponse)
async def update_task(
    task_id: int,
    data: TaskUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Редактирование задачи/тендера автором или администратором."""
    res = await db.execute(select(Task).where(Task.id == task_id))
    task = res.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="Задача не найдена")

    if task.investor_id != current_user.id and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Вы можете редактировать только собственные задачи")

    if data.title is not None:
        task.title = data.title.strip()
    if data.description is not None:
        task.description = data.description.strip()
    if data.budget is not None:
        task.budget = data.budget
    if data.deadline is not None:
        task.deadline = data.deadline.strip()
    if data.milestones is not None:
        clean_milestones = []
        for idx, m in enumerate(data.milestones, 1):
            clean_milestones.append({
                "step": idx,
                "title": m.get("title", f"Этап {idx}"),
                "amount": float(m.get("amount", 0)),
            })
        task.milestones = clean_milestones

    await db.commit()
    await db.refresh(task)

    # Обновление сертификата депонирования ТЗ
    try:
        await get_or_create_deposit_certificate(db, "task", task.id, force_regenerate=True)
    except Exception as e:
        print(f"[TASK UPDATE] Certificate warning: {e}")

    u_res = await db.execute(select(User).where(User.id == task.investor_id))
    user = u_res.scalar_one_or_none()

    t_res = TaskResponse.model_validate(task)
    t_res.investor_name = user.full_name if user else None
    return t_res


@router.delete("/{task_id}")
async def delete_task(
    task_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Удаление задачи/тендера автором или администратором."""
    res = await db.execute(select(Task).where(Task.id == task_id))
    task = res.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="Задача не найдена")

    if task.investor_id != current_user.id and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Вы можете удалять только собственные задачи")

    from app.models.certificate import DepositCertificate
    await db.execute(
        DepositCertificate.__table__.delete().where(
            DepositCertificate.entity_type == "task",
            DepositCertificate.entity_id == task_id,
        )
    )

    await db.delete(task)
    await db.commit()

    return {"status": "ok", "message": "Задача успешно удалена"}


@router.post("/{task_id}/bids", response_model=TaskBidResponse, status_code=status.HTTP_201_CREATED)
async def create_task_bid(
    task_id: int,
    data: TaskBidCreateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Проверка верификации НИИ
    if current_user.role == "lab" and current_user.verification_status != "verified":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Откликаться на задачи инвесторов могут только верифицированные НИИ.",
        )

    # Проверка существования задачи
    res = await db.execute(select(Task).where(Task.id == task_id))
    task = res.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="Задача не найдена")

    if task.status != "open":
        raise HTTPException(status_code=400, detail="Задача уже закрыта или находится в работе")

    # Проверка, нет ли уже отклика
    existing = await db.execute(
        select(TaskBid).where(TaskBid.task_id == task_id, TaskBid.lab_id == current_user.id)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Вы уже отправили отклик на эту задачу")

    bid = TaskBid(
        task_id=task_id,
        lab_id=current_user.id,
        proposal_text=data.proposal_text.strip(),
        proposed_budget=data.proposed_budget,
        status="pending",
    )
    db.add(bid)
    await db.flush()

    # Автоматическое создание целевого контекстного чата
    lab_display_name = current_user.organization_name or current_user.full_name
    chat_title = f"Отклик: {task.title[:40]}"
    intro_message = (
        f"НИИ «{lab_display_name}» подал отклик на вашу задачу «{task.title}» "
        f"с ценовым предложением {bid.proposed_budget:,.2f} ₽.\n\n"
        f"Сопроводительное сообщение:\n{bid.proposal_text}"
    )
    chat, _ = await get_or_create_context_chat(
        db=db,
        investor_id=task.investor_id,
        lab_id=current_user.id,
        context_type="task_bid",
        context_id=bid.id,
        title=chat_title,
        initial_message=intro_message,
        sender_id=current_user.id,
    )

    await db.commit()
    await db.refresh(bid)

    bid_dto = TaskBidResponse.model_validate(bid)
    bid_dto.lab_name = current_user.full_name
    bid_dto.organization_name = current_user.organization_name
    bid_dto.chat_id = chat.id
    return bid_dto


@router.post("/{task_id}/bids/{bid_id}/accept", status_code=status.HTTP_200_OK)
async def accept_task_bid(
    task_id: int,
    bid_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Только автор задачи может принять отклик
    t_res = await db.execute(select(Task).where(Task.id == task_id))
    task = t_res.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="Задача не найдена")

    if task.investor_id != current_user.id and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Вы не являетесь автором этой задачи")

    b_res = await db.execute(select(TaskBid).where(TaskBid.id == bid_id, TaskBid.task_id == task_id))
    bid = b_res.scalar_one_or_none()
    if not bid:
        raise HTTPException(status_code=404, detail="Отклик не найден")

    bid.status = "accepted"
    task.status = "in_progress"

    # Создаем проект
    project = Project(
        title=f"Проект: {task.title}",
        investor_id=task.investor_id,
        lab_id=bid.lab_id,
        total_budget=bid.proposed_budget,
        status="active",
    )
    db.add(project)
    await db.flush()

    # Создаем начальные этапы
    m1 = ProjectMilestone(
        project_id=project.id,
        step_number=1,
        title="Исследования и согласование ТЗ",
        amount=bid.proposed_budget * Decimal("0.3"),
        status="pending_funds",
    )
    m2 = ProjectMilestone(
        project_id=project.id,
        step_number=2,
        title="Создание прототипа и проведение испытаний",
        amount=bid.proposed_budget * Decimal("0.7"),
        status="pending_funds",
    )
    db.add(m1)
    db.add(m2)

    # Создаем чат
    chat = Chat(
        investor_id=task.investor_id,
        lab_id=bid.lab_id,
        project_id=project.id,
        title=f"Сделка: {task.title}",
    )
    db.add(chat)
    await db.flush()

    db.add(Message(
        chat_id=chat.id,
        sender_id=current_user.id,
        content=f"Ваше предложение по задаче «{task.title}» принято! Проект открыт, переходим к финансированию и работе.",
    ))

    await db.commit()
    return {"message": "Отклик принят, проект и чат успешно сформированы", "project_id": project.id, "chat_id": chat.id}


@router.get("/{task_id}/recommended-labs")
async def get_recommended_labs(
    task_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Возвращает Топ-3 рекомендованных научных центра (AI Matchmaking) для задачи заказчика.
    """
    # Загружаем приглашения матчинга по задаче
    inv_res = await db.execute(
        select(MatchingInvitation).where(
            MatchingInvitation.source_type == "task",
            MatchingInvitation.source_id == task_id,
        ).order_by(MatchingInvitation.similarity_score.desc()).limit(3)
    )
    invitations = inv_res.scalars().all()

    # Если еще не рассчитывалось, запускаем подбор
    if not invitations:
        invitations = await run_task_matchmaking(db, task_id)

    results = []
    for inv in invitations:
        u_res = await db.execute(select(User).where(User.id == inv.lab_id))
        lab = u_res.scalar_one_or_none()
        if lab:
            results.append({
                "invitation_id": inv.id,
                "lab_id": lab.id,
                "organization_name": lab.organization_name or lab.full_name,
                "representative_name": lab.representative_name,
                "inn": lab.inn,
                "verification_status": lab.verification_status,
                "bio": lab.bio,
                "similarity_score": inv.similarity_score,
                "match_percent": int(inv.similarity_score * 100),
                "matched_reasons": inv.matched_reasons,
                "status": inv.status,
                "patents_count": len(lab.patents_info or []),
            })

    return results


@router.get("/lab/invitations")
async def get_lab_task_invitations(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Возвращает список персональных приглашений на задачи для текущей научной лаборатории (НИИ).
    """
    if current_user.role != "lab" and not current_user.is_admin:
        return []

    inv_res = await db.execute(
        select(MatchingInvitation).where(
            MatchingInvitation.source_type == "task",
            MatchingInvitation.lab_id == current_user.id,
        ).order_by(MatchingInvitation.id.desc())
    )
    invitations = inv_res.scalars().all()

    items = []
    for inv in invitations:
        t_res = await db.execute(select(Task).where(Task.id == inv.source_id))
        task = t_res.scalar_one_or_none()
        if not task:
            continue

        u_res = await db.execute(select(User.full_name).where(User.id == task.investor_id))
        inv_name = u_res.scalar_one_or_none()

        items.append({
            "invitation_id": inv.id,
            "task_id": task.id,
            "title": task.title,
            "description": task.description,
            "budget": task.budget,
            "deadline": task.deadline,
            "investor_name": inv_name or "Заказчик",
            "similarity_score": inv.similarity_score,
            "match_percent": int(inv.similarity_score * 100),
            "matched_reasons": inv.matched_reasons,
            "status": inv.status,
            "created_at": inv.created_at,
        })

    return items


@router.post("/invitations/{invitation_id}/respond")
async def respond_to_invitation(
    invitation_id: int,
    action: str,  # "viewed" | "accepted" | "declined"
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Отметка о просмотре или ответе лаборатории на персональное приглашение."""
    res = await db.execute(
        select(MatchingInvitation).where(
            MatchingInvitation.id == invitation_id,
            MatchingInvitation.lab_id == current_user.id,
        )
    )
    inv = res.scalar_one_or_none()
    if not inv:
        raise HTTPException(status_code=404, detail="Приглашение не найдено")

    if action in ["viewed", "accepted", "declined"]:
        inv.status = action
        await db.commit()

    return {"success": True, "status": inv.status}

