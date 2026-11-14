import os
from decimal import Decimal
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, func, or_, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_admin
from app.models.user import User
from app.models.idea import Idea
from app.models.task import Task
from app.models.project import Project, ProjectMilestone, ProjectFile
from app.models.finance import Account, Transaction
from app.models.chat import Chat, Message
from app.models.support import SupportTicket, TicketMessage
from app.models.notification import Notification
from app.models.audit import AdminAuditLog
from app.api.v1.endpoints.realtime import manager
from app.schemas.user import UserResponse
from app.schemas.idea import IdeaResponse
from app.schemas.support import SupportTicketResponse, TicketReplyRequest
from app.services.ai_service import summarize_ticket_ai
from app.schemas.admin import (
    AdminStatsResponse,
    AuditLogResponse,
    UserVerifyRequest,
    UserBlockRequest,
    UserEditRequest,
    ContentModerateRequest,
    FinanceAdjustRequest,
    MilestoneResolveRequest,
)

router = APIRouter()


async def log_admin_action(
    db: AsyncSession,
    admin: User,
    action: str,
    target_type: str,
    target_id: int | str | None,
    details: dict | str | None = None,
):
    """Фиксация действий администратора в журнал аудита admin_audit_logs."""
    if isinstance(details, str):
        payload = {"message": details}
    elif isinstance(details, dict):
        payload = details
    else:
        payload = {}

    clean_target_id = None
    if target_id is not None:
        try:
            clean_target_id = int(target_id)
        except (ValueError, TypeError):
            clean_target_id = None

    entry = AdminAuditLog(
        admin_id=admin.id,
        admin_name=admin.full_name,
        admin_email=admin.email,
        action=action,
        target_type=target_type,
        target_id=clean_target_id,
        details=payload,
    )
    db.add(entry)


# 1. СТАТИСТИКА
@router.get("/stats", response_model=AdminStatsResponse)
async def get_admin_stats(
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    # Ожидают верификации НИИ
    labs_res = await db.execute(
        select(func.count(User.id)).where(User.role == "lab", User.verification_status == "pending")
    )
    pending_labs = labs_res.scalar() or 0

    # Ожидают модерации (идеи + задачи)
    ideas_res = await db.execute(select(func.count(Idea.id)).where(Idea.moderation_status == "pending"))
    pending_ideas = ideas_res.scalar() or 0

    tasks_res = await db.execute(select(func.count(Task.id)).where(Task.moderation_status == "pending"))
    pending_tasks = tasks_res.scalar() or 0
    pending_content = pending_ideas + pending_tasks

    # Сумма замороженных средств в эскроу
    escrow_res = await db.execute(select(func.sum(Account.frozen_balance)))
    total_frozen_escrow = escrow_res.scalar() or Decimal("0.00")

    # Доход платформы (сумма удержанных platform_fee)
    fee_res = await db.execute(select(func.sum(Transaction.amount)).where(Transaction.type == "platform_fee"))
    platform_revenue = fee_res.scalar() or Decimal("0.00")

    # Активные споры
    dispute_res = await db.execute(
        select(func.count(ProjectMilestone.id)).where(ProjectMilestone.status == "disputed")
    )
    active_disputes = dispute_res.scalar() or 0

    # Открытые тикеты
    tickets_res = await db.execute(
        select(func.count(SupportTicket.id)).where(SupportTicket.status.in_(["open", "in_progress"]))
    )
    open_tickets = tickets_res.scalar() or 0

    return AdminStatsResponse(
        pending_labs=pending_labs,
        pending_content=pending_content,
        total_frozen_escrow=total_frozen_escrow,
        platform_revenue=platform_revenue,
        active_disputes=active_disputes,
        open_tickets=open_tickets,
    )


# 2. ЖУРНАЛ АУДИТА
@router.get("/audit-logs", response_model=list[AuditLogResponse])
async def get_audit_logs(
    action: str | None = Query(None),
    target_type: str | None = Query(None),
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    query = select(AdminAuditLog).order_by(desc(AdminAuditLog.created_at)).limit(200)
    if action:
        query = query.where(AdminAuditLog.action == action)
    if target_type:
        query = query.where(AdminAuditLog.target_type == target_type)

    result = await db.execute(query)
    logs = result.scalars().all()
    return [AuditLogResponse.model_validate(l) for l in logs]


# 3. ПОЛЬЗОВАТЕЛИ И НИИ
@router.get("/users", response_model=list[UserResponse])
async def list_users(
    tab: str | None = Query("all", description="pending_labs | labs | investors | blocked | all"),
    search: str | None = Query(None),
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    query = select(User).order_by(User.id.desc())

    if tab == "pending_labs":
        query = query.where(User.role == "lab", User.verification_status == "pending")
    elif tab == "labs":
        query = query.where(User.role == "lab")
    elif tab == "investors":
        query = query.where(User.role == "investor")
    elif tab == "blocked":
        query = query.where(User.is_active == False)

    if search:
        s = f"%{search.lower()}%"
        query = query.where(
            or_(
                User.full_name.ilike(s),
                User.email.ilike(s),
                User.organization_name.ilike(s),
                User.inn.ilike(s),
                User.representative_name.ilike(s),
            )
        )

    result = await db.execute(query)
    users = result.scalars().all()
    return [UserResponse.model_validate(u) for u in users]


@router.patch("/users/{user_id}/verify", response_model=UserResponse)
async def verify_user(
    user_id: int,
    data: UserVerifyRequest,
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(select(User).where(User.id == user_id))
    user = res.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")

    old_status = user.verification_status
    user.verification_status = data.verification_status
    user.status = "active" if data.verification_status == "verified" else "rejected"
    if data.comment is not None:
        user.moderation_comment = data.comment

    await log_admin_action(
        db=db,
        admin=admin,
        action="verify_user",
        target_type="user",
        target_id=user.id,
        details=f"Верификация: статус изменён с '{old_status}' на '{data.verification_status}'. Комментарий: {data.comment or 'Отсутствует'}",
    )
    await db.commit()
    await db.refresh(user)
    return UserResponse.model_validate(user)


@router.patch("/users/{user_id}/block", response_model=UserResponse)
async def block_unblock_user(
    user_id: int,
    data: UserBlockRequest,
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(select(User).where(User.id == user_id))
    user = res.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")

    if user.id == admin.id:
        raise HTTPException(status_code=400, detail="Нельзя заблокировать собственный аккаунт администратора")

    user.is_active = data.is_active
    if data.reason:
        user.moderation_comment = data.reason

    action_name = "unblock_user" if data.is_active else "block_user"
    await log_admin_action(
        db=db,
        admin=admin,
        action=action_name,
        target_type="user",
        target_id=user.id,
        details=f"Блокировка аккаунта: is_active={data.is_active}. Причина: {data.reason or 'Решение модератора'}",
    )
    await db.commit()
    await db.refresh(user)
    return UserResponse.model_validate(user)


@router.patch("/users/{user_id}/edit", response_model=UserResponse)
async def edit_user_requisites(
    user_id: int,
    data: UserEditRequest,
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(select(User).where(User.id == user_id))
    user = res.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")

    changes = []
    if data.organization_name is not None:
        user.organization_name = data.organization_name
        changes.append(f"org={data.organization_name}")
    if data.representative_name is not None:
        user.representative_name = data.representative_name
        changes.append(f"representative={data.representative_name}")
    if data.inn is not None:
        user.inn = data.inn
        changes.append(f"inn={data.inn}")
    if data.ogrn is not None:
        user.ogrn = data.ogrn
        changes.append(f"ogrn={data.ogrn}")
    if data.full_name is not None:
        user.full_name = data.full_name
        changes.append(f"name={data.full_name}")
    if data.is_admin is not None:
        user.is_admin = data.is_admin
        changes.append(f"is_admin={data.is_admin}")

    await log_admin_action(
        db=db,
        admin=admin,
        action="edit_user",
        target_type="user",
        target_id=user.id,
        details=f"Редактирование профиля/роли: {', '.join(changes)}",
    )
    await db.commit()
    await db.refresh(user)
    return UserResponse.model_validate(user)


# 4. МОДЕРАЦИЯ КОНТЕНТА
@router.get("/content")
async def list_content_for_moderation(
    type: str = Query("all", description="lab_tech | investor_idea | task | all"),
    status: str | None = Query(None),
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    items = []

    # Разработки НИИ и идеи инвесторов
    if type in ["all", "lab_tech", "investor_idea"]:
        q_ideas = select(Idea, User.full_name, User.organization_name).join(User, Idea.author_id == User.id)
        if type in ["lab_tech", "investor_idea"]:
            q_ideas = q_ideas.where(Idea.type == type)
        if status:
            q_ideas = q_ideas.where(Idea.moderation_status == status)
        q_ideas = q_ideas.order_by(Idea.id.desc())
        res_ideas = await db.execute(q_ideas)
        for idea, author_name, org_name in res_ideas.all():
            items.append({
                "item_type": idea.type,
                "id": idea.id,
                "title": idea.title,
                "summary": idea.summary,
                "category": idea.category,
                "trl_level": idea.trl_level,
                "budget_total": idea.budget_total,
                "file_hash": idea.file_hash,
                "moderation_status": idea.moderation_status,
                "moderation_comment": idea.moderation_comment,
                "created_at": idea.created_at,
                "author_name": author_name,
                "organization_name": org_name,
                "milestones": idea.milestones,
            })

    # R&D-задачи на бирже
    if type in ["all", "task"]:
        q_tasks = select(Task, User.full_name).join(User, Task.investor_id == User.id)
        if status:
            q_tasks = q_tasks.where(Task.moderation_status == status)
        q_tasks = q_tasks.order_by(Task.id.desc())
        res_tasks = await db.execute(q_tasks)
        for task, inv_name in res_tasks.all():
            items.append({
                "item_type": "task",
                "id": task.id,
                "title": task.title,
                "summary": task.description,
                "category": "Заказ на разработку",
                "trl_level": 4,
                "budget_total": task.budget,
                "file_hash": f"task-sha256-{task.id}",
                "moderation_status": task.moderation_status,
                "moderation_comment": None,
                "created_at": task.created_at,
                "author_name": inv_name,
                "organization_name": None,
                "deadline": task.deadline,
                "status": task.status,
            })

    return items


@router.patch("/content/{content_type}/{content_id}")
async def moderate_content_item(
    content_type: str,
    content_id: int,
    data: ContentModerateRequest,
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    if content_type in ["lab_tech", "investor_idea"]:
        res = await db.execute(select(Idea).where(Idea.id == content_id))
        idea = res.scalar_one_or_none()
        if not idea:
            raise HTTPException(status_code=404, detail="Разработка не найдена")

        old_status = idea.moderation_status
        idea.moderation_status = data.status
        if data.moderation_comment is not None:
            idea.moderation_comment = data.moderation_comment
        if data.title:
            idea.title = data.title
        if data.summary:
            idea.summary = data.summary
        if data.category:
            idea.category = data.category
        if data.trl_level is not None:
            idea.trl_level = data.trl_level
        if data.budget_total is not None:
            idea.budget_total = data.budget_total

        await log_admin_action(
            db=db,
            admin=admin,
            action="moderate_content",
            target_type="idea",
            target_id=idea.id,
            details=f"Модерация идеи '{idea.title}': статус '{old_status}' -> '{data.status}'. Комментарий: {data.moderation_comment or 'Нет'}",
        )
        await db.commit()
        return {"success": True, "message": f"Статус обновлён на {data.status}"}

    elif content_type == "task":
        res = await db.execute(select(Task).where(Task.id == content_id))
        task = res.scalar_one_or_none()
        if not task:
            raise HTTPException(status_code=404, detail="Задача не найдена")

        task.moderation_status = data.status
        if data.title:
            task.title = data.title
        if data.summary:
            task.description = data.summary

        await log_admin_action(
            db=db,
            admin=admin,
            action="moderate_content",
            target_type="task",
            target_id=task.id,
            details=f"Модерация задачи #{task.id}: статус '{data.status}'",
        )
        await db.commit()
        return {"success": True, "message": f"Статус задачи обновлён на {data.status}"}

    raise HTTPException(status_code=400, detail="Неверный тип контента")


@router.delete("/files/{file_id}")
async def delete_project_file(
    file_id: int,
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(select(ProjectFile).where(ProjectFile.id == file_id))
    pf = res.scalar_one_or_none()
    if not pf:
        raise HTTPException(status_code=404, detail="Файл не найден")

    # Удаление с диска
    if os.path.exists(pf.file_path):
        try:
            os.remove(pf.file_path)
        except Exception as e:
            print(f"Error removing file {pf.file_path}: {e}")

    await log_admin_action(
        db=db,
        admin=admin,
        action="delete_file",
        target_type="file",
        target_id=pf.id,
        details=f"Удаление некорректного файла '{pf.file_name}' из проекта #{pf.project_id}",
    )

    await db.delete(pf)
    await db.commit()
    return {"success": True, "message": f"Файл {pf.file_name} успешно удалён модератором"}


# 5. ФИНАНСЫ И УПРАВЛЕНИЕ СЧЕТАМИ
@router.get("/finances/transactions")
async def list_admin_transactions(
    type: str | None = Query(None),
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    # Счета пользователей
    acc_res = await db.execute(
        select(Account, User.email, User.full_name, User.role, User.organization_name)
        .join(User, Account.user_id == User.id)
        .order_by(Account.available_balance.desc())
    )
    accounts = [
        {
            "user_id": acc.user_id,
            "email": email,
            "full_name": full_name,
            "organization_name": org_name,
            "role": role,
            "available_balance": acc.available_balance,
            "frozen_balance": acc.frozen_balance,
        }
        for acc, email, full_name, role, org_name in acc_res.all()
    ]

    # Транзакции
    tx_q = select(Transaction).order_by(desc(Transaction.created_at)).limit(300)
    if type:
        tx_q = tx_q.where(Transaction.type == type)

    tx_res = await db.execute(tx_q)
    transactions = [
        {
            "id": tx.id,
            "from_user_id": tx.from_user_id,
            "to_user_id": tx.to_user_id,
            "project_id": tx.project_id,
            "amount": tx.amount,
            "type": tx.type,
            "status": getattr(tx, "status", "completed"),
            "description": tx.description,
            "bank_details": getattr(tx, "bank_details", None),
            "created_at": tx.created_at,
        }
        for tx in tx_res.scalars().all()
    ]

    return {
        "accounts": accounts,
        "transactions": transactions,
    }


@router.post("/finances/transactions/{transaction_id}/approve")
async def approve_payout(
    transaction_id: int,
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Подтверждает исполнение банковской заявки на вывод средств."""
    tx_res = await db.execute(select(Transaction).where(Transaction.id == transaction_id))
    tx = tx_res.scalar_one_or_none()
    if not tx:
        raise HTTPException(status_code=404, detail="Транзакция не найдена")
    if tx.status == "completed":
        return {"message": "Транзакция уже имеет статус исполненной", "status": tx.status}

    tx.status = "completed"
    await log_admin_action(
        db, admin, "payout_approved", "finance", tx.id,
        f"Выплата {tx.amount} ₽ подтверждена и отправлена в банк"
    )
    await db.commit()
    return {"message": f"Выплата {tx.amount} ₽ успешно подтверждена", "status": "completed"}


@router.post("/finances/transactions/{transaction_id}/reject")
async def reject_payout(
    transaction_id: int,
    reason: str = Query("Отклонено банком / неверные реквизиты"),
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Отклоняет заявку на вывод и возвращает средства на доступный баланс пользователя."""
    tx_res = await db.execute(select(Transaction).where(Transaction.id == transaction_id))
    tx = tx_res.scalar_one_or_none()
    if not tx:
        raise HTTPException(status_code=404, detail="Транзакция не найдена")
    if tx.status == "rejected":
        return {"message": "Транзакция уже отклонена", "status": tx.status}

    # Возврат средств пользователю
    if tx.from_user_id:
        acc_res = await db.execute(select(Account).where(Account.user_id == tx.from_user_id))
        account = acc_res.scalar_one_or_none()
        if account:
            account.available_balance += tx.amount

    tx.status = "rejected"
    tx.description += f" [ОТКЛОНЕНО: {reason}]"

    await log_admin_action(
        db, admin, "payout_rejected", "finance", tx.id,
        f"Заявка на вывод {tx.amount} ₽ отклонена ({reason}), средства возвращены на баланс"
    )
    await db.commit()
    return {"message": f"Заявка на вывод {tx.amount} ₽ отклонена, баланс восстановлен", "status": "rejected"}


@router.post("/finances/adjust")
async def adjust_user_balance(
    data: FinanceAdjustRequest,
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    acc_res = await db.execute(select(Account).where(Account.user_id == data.user_id))
    account = acc_res.scalar_one_or_none()
    if not account:
        account = Account(user_id=data.user_id, available_balance=Decimal("0.00"), frozen_balance=Decimal("0.00"))
        db.add(account)

    if data.action == "deposit":
        account.available_balance += data.amount
        tx_type = "deposit"
        tx_desc = f"Ручное начисление администратором: {data.reason}"
    elif data.action == "deduct":
        if account.available_balance < data.amount:
            raise HTTPException(status_code=400, detail="Недостаточно доступных средств на балансе для списания")
        account.available_balance -= data.amount
        tx_type = "refund"
        tx_desc = f"Ручное списание администратором: {data.reason}"
    else:
        raise HTTPException(status_code=400, detail="Неверное действие. Используйте deposit или deduct.")

    db.add(Transaction(
        from_user_id=admin.id if data.action == "deposit" else data.user_id,
        to_user_id=data.user_id if data.action == "deposit" else None,
        project_id=None,
        amount=data.amount,
        type=tx_type,
        description=tx_desc,
    ))

    await log_admin_action(
        db=db,
        admin=admin,
        action="adjust_balance",
        target_type="account",
        target_id=data.user_id,
        details=f"Корректировка счёта пользователя #{data.user_id}: {data.action} {data.amount} ₽. Основание: {data.reason}",
    )
    await db.commit()
    return {
        "success": True,
        "message": f"Баланс пользователя успешно изменён на {data.amount} ₽",
        "new_available_balance": account.available_balance,
    }


# 6. АКТИВНЫЕ ПРОЕКТЫ И АРБИТРАЖ
@router.get("/projects")
async def list_admin_projects(
    tab: str = Query("all", description="disputed | in_review | active | completed | all"),
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    q = (
        select(Project, User.full_name, User.organization_name)
        .join(User, Project.lab_id == User.id)
        .order_by(desc(Project.id))
    )
    if tab == "disputed":
        q = q.where(Project.status == "disputed")
    elif tab == "active":
        q = q.where(Project.status == "active")
    elif tab == "completed":
        q = q.where(Project.status == "completed")

    res = await db.execute(q)
    rows = res.all()

    projects = []
    for proj, lab_name, lab_org in rows:
        inv_res = await db.execute(select(User.full_name).where(User.id == proj.investor_id))
        inv_name = inv_res.scalar_one_or_none()

        m_res = await db.execute(
            select(ProjectMilestone).where(ProjectMilestone.project_id == proj.id).order_by(ProjectMilestone.step_number.asc())
        )
        milestones = [
            {
                "id": m.id,
                "step_number": m.step_number,
                "title": m.title,
                "amount": m.amount,
                "status": m.status,
                "raw_report": m.raw_report,
                "ai_summary": m.ai_summary,
            }
            for m in m_res.scalars().all()
        ]

        # Фильтр in_review
        if tab == "in_review" and not any(m["status"] == "in_review" for m in milestones):
            continue

        f_res = await db.execute(select(ProjectFile).where(ProjectFile.project_id == proj.id))
        files = [
            {
                "id": f.id,
                "file_name": f.file_name,
                "file_size": f.file_size,
                "mime_type": f.mime_type,
                "uploaded_at": f.uploaded_at,
            }
            for f in f_res.scalars().all()
        ]

        projects.append({
            "id": proj.id,
            "title": proj.title,
            "investor_id": proj.investor_id,
            "investor_name": inv_name or "Инвестор",
            "lab_id": proj.lab_id,
            "lab_name": lab_org or lab_name or "НИИ",
            "total_budget": proj.total_budget,
            "status": proj.status,
            "created_at": proj.created_at,
            "milestones": milestones,
            "files": files,
        })

    return projects


@router.get("/chats/{project_id}")
async def get_project_chat_history(
    project_id: int,
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    c_res = await db.execute(select(Chat).where(Chat.project_id == project_id))
    chat = c_res.scalar_one_or_none()
    if not chat:
        return []

    m_res = await db.execute(
        select(Message, User.full_name)
        .join(User, Message.sender_id == User.id)
        .where(Message.chat_id == chat.id)
        .order_by(Message.id.asc())
    )
    rows = m_res.all()

    return [
        {
            "id": msg.id,
            "sender_name": sender_name,
            "sender_id": msg.sender_id,
            "content": msg.content,
            "created_at": msg.created_at,
        }
        for msg, sender_name in rows
    ]


@router.post("/milestones/{milestone_id}/resolve")
async def resolve_dispute(
    milestone_id: int,
    data: MilestoneResolveRequest,
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    m_res = await db.execute(select(ProjectMilestone).where(ProjectMilestone.id == milestone_id))
    milestone = m_res.scalar_one_or_none()
    if not milestone:
        raise HTTPException(status_code=404, detail="Этап не найден")

    p_res = await db.execute(select(Project).where(Project.id == milestone.project_id))
    project = p_res.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Проект не найден")

    inv_acc_res = await db.execute(select(Account).where(Account.user_id == project.investor_id))
    inv_acc = inv_acc_res.scalar_one_or_none()

    lab_acc_res = await db.execute(select(Account).where(Account.user_id == project.lab_id))
    lab_acc = lab_acc_res.scalar_one_or_none()

    if data.action == "release":
        if inv_acc:
            inv_acc.frozen_balance = max(Decimal("0.00"), inv_acc.frozen_balance - milestone.amount)

        fee = milestone.amount * Decimal("0.07")
        payout = milestone.amount - fee

        if not lab_acc:
            lab_acc = Account(user_id=project.lab_id, available_balance=Decimal("0.00"), frozen_balance=Decimal("0.00"))
            db.add(lab_acc)
        lab_acc.available_balance += payout

        milestone.status = "completed"

        db.add(Transaction(
            from_user_id=project.investor_id,
            to_user_id=project.lab_id,
            project_id=project.id,
            amount=payout,
            type="escrow_release",
            description=f"Арбитраж: выплата исполнителю по этапу №{milestone.step_number} ({data.comment or 'Одобрено модератором'})",
        ))
        db.add(Transaction(
            from_user_id=project.investor_id,
            to_user_id=None,
            project_id=project.id,
            amount=fee,
            type="platform_fee",
            description="Комиссия сервиса по решению арбитража",
        ))

    elif data.action == "refund":
        if inv_acc:
            inv_acc.frozen_balance = max(Decimal("0.00"), inv_acc.frozen_balance - milestone.amount)
            inv_acc.available_balance += milestone.amount

        milestone.status = "pending_funds"

        db.add(Transaction(
            from_user_id=project.lab_id,
            to_user_id=project.investor_id,
            project_id=project.id,
            amount=milestone.amount,
            type="refund",
            description=f"Арбитраж: возврат средств инвестору по этапу №{milestone.step_number} ({data.comment or 'Отклонено модератором'})",
        ))
    else:
        raise HTTPException(status_code=400, detail="Неверное действие. Используйте 'release' или 'refund'.")

    # Снимаем статус спора с проекта
    project.status = "active"

    await log_admin_action(
        db=db,
        admin=admin,
        action="resolve_dispute",
        target_type="milestone",
        target_id=milestone.id,
        details=f"Решение арбитража по этапу #{milestone.id} (Проект #{project.id}): action={data.action}, сумма={milestone.amount} ₽. Комментарий: {data.comment or 'Нет'}",
    )
    await db.commit()
    return {"message": "Решение арбитража успешно зафиксировано и исполнено", "status": milestone.status}


# 7. ТИКЕТЫ ПОДДЕРЖКИ
@router.get("/tickets", response_model=list[SupportTicketResponse])
async def list_all_tickets(
    status: str | None = Query(None),
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    query = (
        select(SupportTicket, User.full_name, User.email)
        .join(User, SupportTicket.user_id == User.id)
        .order_by(SupportTicket.id.desc())
    )
    if status:
        query = query.where(SupportTicket.status == status)

    result = await db.execute(query)
    rows = result.all()

    tickets = []
    for t, full_name, email in rows:
        dto = SupportTicketResponse.model_validate(t)
        dto.user_name = full_name
        dto.user_email = email
        tickets.append(dto)
    return tickets


@router.post("/tickets/{ticket_id}/reply", response_model=SupportTicketResponse)
async def reply_to_ticket(
    ticket_id: int,
    data: TicketReplyRequest,
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(select(SupportTicket).where(SupportTicket.id == ticket_id))
    ticket = res.scalar_one_or_none()
    if not ticket:
        raise HTTPException(status_code=404, detail="Тикет не найден")

    ticket.admin_reply = data.admin_reply.strip()
    ticket.status = data.status

    # Сохраняем сообщение в историю диалога
    new_msg = TicketMessage(
        ticket_id=ticket.id,
        sender_id=admin.id,
        is_admin_reply=True,
        content=data.admin_reply.strip(),
    )
    db.add(new_msg)
    await db.flush()

    # Уведомление пользователю
    notif = Notification(
        recipient_id=ticket.user_id,
        type="support_message",
        title="Ответ от службы заботы",
        body=f"Куратор ответил на обращение #{ticket.id}: {ticket.subject}",
        link_url="/dashboard?tab=support",
        severity="info",
    )
    db.add(notif)

    await log_admin_action(
        db=db,
        admin=admin,
        action="reply_ticket",
        target_type="ticket",
        target_id=ticket.id,
        details=f"Ответ куратора на тикет #{ticket.id} ('{ticket.subject}'): статус={data.status}",
    )
    await db.commit()
    await db.refresh(ticket)

    # Broadcast через WebSocket в реальном времени
    try:
        await manager.broadcast_ticket(ticket.id, {
            "type": "ticket_message",
            "id": new_msg.id,
            "ticket_id": ticket.id,
            "sender_id": admin.id,
            "sender_name": "Служба заботы",
            "is_admin_reply": True,
            "content": new_msg.content,
            "created_at": new_msg.created_at.isoformat() if new_msg.created_at else None,
        })
    except Exception:
        pass

    return SupportTicketResponse.model_validate(ticket)


# 8. ГЛОБАЛЬНЫЙ ПОИСК ДЛЯ АДМИН-ПАНЕЛИ (Cmd/Ctrl + K)
@router.get("/search")
async def admin_global_search(
    q: str = Query(..., min_length=1),
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    query_str = f"%{q.strip()}%"

    # Поиск пользователей и НИИ
    users_res = await db.execute(
        select(User).where(
            (User.email.ilike(query_str)) |
            (User.full_name.ilike(query_str)) |
            (User.organization_name.ilike(query_str)) |
            (User.inn.ilike(query_str))
        ).limit(10)
    )
    users = [
        {
            "id": u.id,
            "title": u.organization_name or u.full_name,
            "subtitle": f"{u.role.upper()} • {u.email} • ИНН: {u.inn or '—'}",
            "type": "user",
            "link": f"/admin/users?search={u.email}",
        }
        for u in users_res.scalars().all()
    ]

    # Поиск проектов
    projects_res = await db.execute(
        select(Project).where(Project.title.ilike(query_str)).limit(10)
    )
    projects = [
        {
            "id": p.id,
            "title": p.title,
            "subtitle": f"Контракт #{p.id} • Бюджет: {p.total_budget} ₽ • Статус: {p.status}",
            "type": "project",
            "link": f"/admin/projects?search={p.id}",
        }
        for p in projects_res.scalars().all()
    ]

    # Поиск идей и разработок
    ideas_res = await db.execute(
        select(Idea).where(Idea.title.ilike(query_str)).limit(10)
    )
    ideas = [
        {
            "id": i.id,
            "title": i.title,
            "subtitle": f"{i.category} • TRL {i.trl_level} • Статус: {i.moderation_status}",
            "type": "idea",
            "link": f"/admin/content?search={i.id}",
        }
        for i in ideas_res.scalars().all()
    ]

    return {
        "results": users + projects + ideas,
    }


# 9. ДОСЬЕ 360° ПОЛЬЗОВАТЕЛЯ И НИИ
@router.get("/users/{user_id}/full")
async def get_user_dossier_360(
    user_id: int,
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    u_res = await db.execute(select(User).where(User.id == user_id))
    user = u_res.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")

    # Баланс
    acc_res = await db.execute(select(Account).where(Account.user_id == user_id))
    account = acc_res.scalar_one_or_none()

    # Разработки / Идеи
    ideas_res = await db.execute(select(Idea).where(Idea.author_id == user_id))
    ideas = ideas_res.scalars().all()

    # Проекты (где пользователь заказчик или исполнитель)
    proj_res = await db.execute(
        select(Project).where((Project.investor_id == user_id) | (Project.lab_id == user_id))
    )
    projects = proj_res.scalars().all()

    # Транзакции
    tx_res = await db.execute(
        select(Transaction).where(
            (Transaction.from_user_id == user_id) | (Transaction.to_user_id == user_id)
        ).order_by(Transaction.created_at.desc()).limit(50)
    )
    transactions = tx_res.scalars().all()

    # Тикеты поддержки
    tickets_res = await db.execute(
        select(SupportTicket).where(SupportTicket.user_id == user_id).order_by(SupportTicket.id.desc())
    )
    tickets = tickets_res.scalars().all()

    return {
        "user": {
            "id": user.id,
            "email": user.email,
            "role": user.role,
            "status": user.status,
            "verification_status": user.verification_status,
            "is_admin": user.is_admin,
            "is_active": user.is_active,
            "full_name": user.full_name,
            "organization_name": user.organization_name,
            "inn": user.inn,
            "ogrn": user.ogrn,
            "representative_name": user.representative_name,
            "patents_info": user.patents_info or [],
            "documents": user.documents or [],
            "moderation_comment": user.moderation_comment,
            "created_at": user.created_at.isoformat() if user.created_at else None,
        },
        "balance": {
            "available": float(account.available_balance) if account else 0.0,
            "frozen": float(account.frozen_balance) if account else 0.0,
        },
        "ideas": [
            {
                "id": i.id,
                "title": i.title,
                "category": i.category,
                "trl_level": i.trl_level,
                "budget_total": float(i.budget_total),
                "moderation_status": i.moderation_status,
                "file_hash": i.file_hash,
                "created_at": i.created_at.isoformat() if i.created_at else None,
            }
            for i in ideas
        ],
        "projects": [
            {
                "id": p.id,
                "title": p.title,
                "total_budget": float(p.total_budget),
                "status": p.status,
                "created_at": p.created_at.isoformat() if p.created_at else None,
            }
            for p in projects
        ],
        "transactions": [
            {
                "id": t.id,
                "amount": float(t.amount),
                "type": t.type,
                "description": t.description,
                "created_at": t.created_at.isoformat() if t.created_at else None,
            }
            for t in transactions
        ],
        "tickets": [
            {
                "id": tk.id,
                "subject": tk.subject,
                "category": tk.category,
                "status": tk.status,
                "created_at": tk.created_at.isoformat() if tk.created_at else None,
            }
            for tk in tickets
        ],
    }


# 10. ИСХОДЯЩИЙ ТИКЕТ ОТ ПОДДЕРЖКИ
class OutboundTicketRequest(BaseModel):
    user_id: int
    category: str
    priority: str = "normal"
    subject: str
    message: str


@router.post("/tickets/create")
async def create_outbound_ticket(
    data: OutboundTicketRequest,
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    ticket = SupportTicket(
        user_id=data.user_id,
        initiated_by_admin=True,
        category=data.category,
        priority=data.priority,
        subject=data.subject,
        description=data.message,
        status="in_progress",
    )
    db.add(ticket)
    await db.flush()

    # Создаем первое сообщение от лица куратора
    t_msg = TicketMessage(
        ticket_id=ticket.id,
        sender_id=admin.id,
        is_admin_reply=True,
        content=data.message,
    )
    db.add(t_msg)

    # Уведомление пользователю
    notif = Notification(
        recipient_id=data.user_id,
        type="support_message",
        title="Новое обращение от службы заботы",
        body=f"Куратор создал тикет #{ticket.id}: {ticket.subject}",
        link_url=f"/dashboard?tab=support",
        severity="info",
    )
    db.add(notif)

    await log_admin_action(
        db=db,
        admin=admin,
        action="create_outbound_ticket",
        target_type="ticket",
        target_id=ticket.id,
        details=f"Исходящий тикет пользователю #{data.user_id}: '{data.subject}'",
    )
    await db.commit()
    return {"success": True, "ticket_id": ticket.id}


# 11. ИИ-АНАЛИЗ ТИКЕТА
@router.post("/tickets/{ticket_id}/ai-summarize")
async def ai_summarize_ticket(
    ticket_id: int,
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    t_res = await db.execute(select(SupportTicket).where(SupportTicket.id == ticket_id))
    ticket = t_res.scalar_one_or_none()
    if not ticket:
        raise HTTPException(status_code=404, detail="Тикет не найден")

    # Получаем историю сообщений тикета для контекста
    msg_res = await db.execute(
        select(TicketMessage).where(TicketMessage.ticket_id == ticket_id).order_by(TicketMessage.created_at.asc())
    )
    messages = msg_res.scalars().all()
    conversation_text = "\n".join([f"{'Админ' if m.is_admin_reply else 'Пользователь'}: {m.message}" for m in messages])

    # ИИ анализ сути обращения через реальную нейросеть
    try:
        ai_result = await summarize_ticket_ai(ticket.subject, ticket.description, conversation_text)
    except Exception as e:
        ai_result = {
            "ai_summary": f"Анализ тикета «{ticket.subject}» (сбой нейросети: {str(e)})",
            "ai_sentiment": "требует ручной проверки",
            "ai_suggested_action": "Ознакомьтесь с текстом обращения и ответьте пользователю.",
            "priority": "medium",
        }

    ticket.ai_summary = ai_result.get("ai_summary", "")
    ticket.ai_sentiment = ai_result.get("ai_sentiment", "нейтральная")
    ticket.ai_suggested_action = ai_result.get("ai_suggested_action", "")
    await db.commit()

    return {
        "ai_summary": ticket.ai_summary,
        "ai_sentiment": ticket.ai_sentiment,
        "ai_suggested_action": ticket.ai_suggested_action,
        "priority": ai_result.get("priority", "medium"),
    }

