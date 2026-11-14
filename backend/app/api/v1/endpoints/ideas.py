import hashlib
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, or_, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.models.idea import Idea
from app.models.project import Project, ProjectMilestone
from app.models.finance import Account, Transaction
from app.models.chat import Chat, Message
from app.models.notification import Notification
from app.schemas.idea import IdeaCreateRequest, IdeaUpdateRequest, IdeaResponse, IdeaOrderRequest
from app.services.chat_service import get_or_create_context_chat
from app.services.certificate_service import get_or_create_deposit_certificate

router = APIRouter()


@router.get("", response_model=list[IdeaResponse])
async def list_ideas(
    category: str | None = Query(None),
    trl: int | None = Query(None),
    type: str | None = Query(None),
    search: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User | None = Depends(get_current_user),
):
    query = select(Idea, User.full_name, User.organization_name).join(User, Idea.author_id == User.id)

    # Обычным пользователям показываем только одобренные модератором + их собственные карточки
    if not current_user or not current_user.is_admin:
        if current_user:
            query = query.where(or_(Idea.moderation_status == "approved", Idea.author_id == current_user.id))
        else:
            query = query.where(Idea.moderation_status == "approved")

    if category and category != "Все":
        query = query.where(Idea.category == category)
    if trl:
        query = query.where(Idea.trl_level >= trl)
    if type:
        query = query.where(Idea.type == type)
    if search:
        s = f"%{search.lower()}%"
        query = query.where(or_(Idea.title.ilike(s), Idea.summary.ilike(s), Idea.category.ilike(s)))

    query = query.order_by(Idea.id.desc())
    result = await db.execute(query)
    rows = result.all()

    response = []
    for idea, author_name, org_name in rows:
        item = IdeaResponse.model_validate(idea)
        item.author_name = author_name
        item.organization_name = org_name
        response.append(item)
    return response


@router.post("", response_model=IdeaResponse, status_code=status.HTTP_201_CREATED)
async def create_idea(
    data: IdeaCreateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Если публикует НИИ — проверяем верификацию
    if current_user.role == "lab" and current_user.verification_status != "verified":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Публикация разработок доступна только после подтверждения верификации НИИ администратором.",
        )

    # Вычисление SHA-256 хеша для фиксации авторского права
    content_to_hash = f"{data.title}:{data.summary}:{current_user.id}".encode("utf-8")
    file_hash = hashlib.sha256(content_to_hash).hexdigest()

    idea = Idea(
        author_id=current_user.id,
        type=data.type,
        title=data.title.strip(),
        summary=data.summary.strip(),
        category=data.category.strip(),
        trl_level=data.trl_level,
        budget_total=data.budget_total,
        milestones=data.milestones,
        file_hash=file_hash,
        moderation_status="approved" if current_user.is_admin else "pending",
    )
    db.add(idea)
    await db.commit()
    await db.refresh(idea)

    # 1. Системное уведомление для автора
    try:
        notif = Notification(
            recipient_id=current_user.id,
            type="idea_created",
            title="Заявка отправлена на модерацию",
            body=f"Ваша разработка «{idea.title}» успешно создана, депонирована в реестре РИД и передана на рассмотрение модератору.",
            link_url="/dashboard?tab=ideas",
            severity="info",
        )
        db.add(notif)
        await db.commit()
    except Exception as e:
        print(f"[IDEA CREATE] Notification error: {e}")

    # 2. Автоматическое формирование свидетельства о депонировании РИД
    try:
        await get_or_create_deposit_certificate(db, "idea", idea.id)
    except Exception as e:
        print(f"[IDEA CREATE] Certificate error: {e}")

    res = IdeaResponse.model_validate(idea)
    res.author_name = current_user.full_name
    res.organization_name = current_user.organization_name
    return res


@router.post("/{idea_id}/demo-approve", response_model=IdeaResponse)
async def demo_approve_idea(
    idea_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Демо-функция: мгновенно одобряет модерацию разработки."""
    res = await db.execute(select(Idea).where(Idea.id == idea_id))
    idea = res.scalar_one_or_none()
    if not idea:
        raise HTTPException(status_code=404, detail="Разработка не найдена")

    idea.moderation_status = "approved"
    idea.moderation_comment = None

    # Системное уведомление об одобрении
    notif = Notification(
        recipient_id=idea.author_id,
        type="idea_approved",
        title="Заявка одобрена модератором!",
        body=f"Разработка «{idea.title}» успешно прошла проверку и опубликована в открытом каталоге платформы.",
        link_url="/dashboard?tab=ideas",
        severity="info",
    )
    db.add(notif)
    await db.commit()
    await db.refresh(idea)

    # Обновляем свидетельство
    try:
        await get_or_create_deposit_certificate(db, "idea", idea.id)
    except Exception:
        pass

    i_author_res = await db.execute(select(User).where(User.id == idea.author_id))
    author = i_author_res.scalar_one_or_none()

    res_dto = IdeaResponse.model_validate(idea)
    res_dto.author_name = author.full_name if author else current_user.full_name
    res_dto.organization_name = author.organization_name if author else current_user.organization_name
    return res_dto


@router.get("/{idea_id}", response_model=IdeaResponse)
async def get_idea(
    idea_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User | None = Depends(get_current_user),
):
    """Получение полных данных о разработке по ее ID."""
    query = select(Idea, User.full_name, User.organization_name).join(User, Idea.author_id == User.id).where(Idea.id == idea_id)
    res = await db.execute(query)
    row = res.first()
    if not row:
        raise HTTPException(status_code=404, detail="Разработка не найдена")

    idea, author_name, org_name = row
    if idea.moderation_status != "approved":
        if not current_user or (current_user.id != idea.author_id and not current_user.is_admin):
            raise HTTPException(status_code=403, detail="Разработка находится на модерации")

    res_dto = IdeaResponse.model_validate(idea)
    res_dto.author_name = author_name
    res_dto.organization_name = org_name
    return res_dto


@router.put("/{idea_id}", response_model=IdeaResponse)
async def update_idea(
    idea_id: int,
    data: IdeaUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Редактирование параметров и этапов разработки автором или администратором."""
    res = await db.execute(select(Idea).where(Idea.id == idea_id))
    idea = res.scalar_one_or_none()
    if not idea:
        raise HTTPException(status_code=404, detail="Разработка не найдена")

    if idea.author_id != current_user.id and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Вы можете редактировать только собственные заявки")

    if data.title is not None:
        idea.title = data.title.strip()
    if data.summary is not None:
        idea.summary = data.summary.strip()
    if data.category is not None:
        idea.category = data.category.strip()
    if data.trl_level is not None:
        idea.trl_level = data.trl_level
    if data.budget_total is not None:
        idea.budget_total = data.budget_total
    if data.milestones is not None:
        clean_milestones = []
        for idx, m in enumerate(data.milestones, 1):
            clean_milestones.append({
                "step": idx,
                "title": m.get("title", f"Этап {idx}"),
                "amount": float(m.get("amount", 0)),
            })
        idea.milestones = clean_milestones

    # Пересчет хеша авторства РИД
    content_to_hash = f"{idea.title}:{idea.summary}:{idea.author_id}".encode("utf-8")
    idea.file_hash = hashlib.sha256(content_to_hash).hexdigest()

    # При редактировании отклоненной заявки переводим обратно на проверку
    if idea.moderation_status == "rejected":
        idea.moderation_status = "pending"
        idea.moderation_comment = None

    await db.commit()
    await db.refresh(idea)

    # Обновление официального свидетельства депонирования
    try:
        await get_or_create_deposit_certificate(db, "idea", idea.id, force_regenerate=True)
    except Exception as e:
        print(f"[IDEA UPDATE] Certificate update warning: {e}")

    u_res = await db.execute(select(User).where(User.id == idea.author_id))
    user = u_res.scalar_one_or_none()

    res_dto = IdeaResponse.model_validate(idea)
    res_dto.author_name = user.full_name if user else None
    res_dto.organization_name = user.organization_name if user else None
    return res_dto


@router.delete("/{idea_id}")
async def delete_idea(
    idea_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Удаление заявки на разработку автором или администратором."""
    res = await db.execute(select(Idea).where(Idea.id == idea_id))
    idea = res.scalar_one_or_none()
    if not idea:
        raise HTTPException(status_code=404, detail="Разработка не найдена")

    if idea.author_id != current_user.id and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Вы можете удалять только собственные заявки")

    from app.models.certificate import DepositCertificate
    await db.execute(
        DepositCertificate.__table__.delete().where(
            DepositCertificate.entity_type == "idea",
            DepositCertificate.entity_id == idea_id,
        )
    )

    await db.delete(idea)
    await db.commit()

    return {"status": "ok", "message": "Заявка успешно удалена"}


@router.post("/{idea_id}/order", status_code=status.HTTP_201_CREATED)
async def order_idea(
    idea_id: int,
    data: IdeaOrderRequest | None = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Idea).where(Idea.id == idea_id))
    idea = result.scalar_one_or_none()
    if not idea:
        raise HTTPException(status_code=404, detail="Разработка не найдена")

    if idea.author_id == current_user.id:
        raise HTTPException(status_code=400, detail="Нельзя заказать собственную разработку")

    investor_id = current_user.id if current_user.role == "investor" else idea.author_id
    lab_id = idea.author_id if current_user.role == "investor" else current_user.id
    budget = (data.proposed_budget if data and data.proposed_budget else idea.budget_total) or Decimal("100000")

    # 1. ОБРАБОТКА ПОЖЕРТВОВАНИЯ (НЕ ПРОЕКТ, А БЕЗВОЗМЕЗДНЫЙ ПЕРЕВОД НА ИССЛЕДОВАНИЯ)
    if data and data.order_type == "donation":
        inv_acc_res = await db.execute(select(Account).where(Account.user_id == current_user.id))
        inv_account = inv_acc_res.scalar_one_or_none()
        if not inv_account or inv_account.available_balance < budget:
            avail = inv_account.available_balance if inv_account else Decimal("0.00")
            raise HTTPException(
                status_code=400,
                detail=f"Недостаточно средств на балансе для пожертвования. Доступно: {avail:,.2f} ₽. Пополните счёт.",
            )

        # Списание у жертвователя
        inv_account.available_balance -= budget

        # Зачисление лаборатории-автору
        lab_acc_res = await db.execute(select(Account).where(Account.user_id == lab_id))
        lab_account = lab_acc_res.scalar_one_or_none()
        if not lab_account:
            lab_account = Account(user_id=lab_id, available_balance=Decimal("0.00"), frozen_balance=Decimal("0.00"))
            db.add(lab_account)
            await db.flush()

        lab_account.available_balance += budget

        # Финансовая проводка пожертвования
        tx = Transaction(
            from_user_id=current_user.id,
            to_user_id=lab_id,
            amount=budget,
            type="donation",
            status="completed",
            description=f"Безвозмездное пожертвование на научные исследования: «{idea.title}»",
        )
        db.add(tx)

        # Уведомление автору разработки
        notif = Notification(
            recipient_id=lab_id,
            type="donation_received",
            title="Получено пожертвование на науку",
            body=f"{current_user.organization_name or current_user.full_name} внёс пожертвование {budget:,.2f} ₽ на развитие вашей разработки «{idea.title}».",
            link_url="/dashboard?tab=finances",
            severity="success",
        )
        db.add(notif)
        await db.commit()

        return {
            "message": f"Пожертвование {budget:,.2f} ₽ успешно перечислено на спецсчёт исследовательской группы!",
            "is_donation": True,
        }

    # 2. ПРОВЕРКА ДУБЛИКАТА: НЕЛЬЗЯ ВЗЯТЬ ОДИН И ТОТ ЖЕ ЗАКАЗ ВТОРОЙ РАЗ
    existing_proj = await db.execute(
        select(Project).where(
            and_(
                Project.investor_id == investor_id,
                Project.lab_id == lab_id,
                Project.title.like(f"%{idea.title}%"),
                Project.status != "cancelled",
            )
        )
    )
    if existing_proj.first():
        raise HTTPException(
            status_code=400,
            detail="Вы уже оформили сделку по данной разработке. Нельзя взять один и тот же заказ дважды.",
        )

    # 3. СОЗДАНИЕ КОММЕРЧЕСКОГО ПРОЕКТА НИОКР
    project = Project(
        title=f"Заказ разработки: {idea.title}",
        investor_id=investor_id,
        lab_id=lab_id,
        total_budget=budget,
        status="active",
    )
    db.add(project)
    await db.flush()

    # Создаем этапы из milestones идеи или одного этапа
    if isinstance(idea.milestones, list) and len(idea.milestones) > 0 and not (data and data.order_type == "donation"):
        for idx, m in enumerate(idea.milestones, 1):
            if isinstance(m, dict):
                s_num = m.get("step", idx)
                s_title = m.get("title", f"Этап {idx}")
                try:
                    s_amt = Decimal(str(m.get("amount", 100000)))
                except Exception:
                    s_amt = Decimal("100000")
            else:
                s_num = idx
                s_title = f"Этап {idx}"
                s_amt = Decimal("100000")
            ms = ProjectMilestone(
                project_id=project.id,
                step_number=int(s_num) if str(s_num).isdigit() else idx,
                title=str(s_title),
                amount=s_amt,
                status="pending_funds",
            )
            db.add(ms)
    else:
        db.add(ProjectMilestone(
            project_id=project.id,
            step_number=1,
            title="Целевое финансирование" if (data and data.order_type == "donation") else "Базовый этап разработки",
            amount=budget,
            status="pending_funds",
        ))

    # Контекстный тип
    if current_user.role == "lab":
        c_type = "idea_proposal"
    elif data and data.order_type == "donation":
        c_type = "donation"
    else:
        c_type = "idea_order"

    budget_formatted = f"{budget:,.2f} ₽".replace(",", " ")
    intro_content = (
        f"Здравствуйте! Инициирована новая сделка ({order_type_label}) по разработке «{idea.title}».\n"
        f"Бюджет: {budget_formatted}.\n"
        f"Инициатор: {current_user.organization_name or current_user.full_name}."
    )

    # Инициируем чат по проекту с контекстом
    chat, _ = await get_or_create_context_chat(
        db=db,
        investor_id=investor_id,
        lab_id=lab_id,
        context_type=c_type,
        context_id=idea.id,
        project_id=project.id,
        title=f"Сделка: {idea.title[:40]}",
        initial_message=intro_content,
        sender_id=current_user.id,
    )

    # Системное уведомление для получателя
    try:
        recipient_id = lab_id if current_user.id == investor_id else investor_id
        notif = Notification(
            recipient_id=recipient_id,
            type="project_created",
            title=f"Новая сделка: {order_type_label}",
            body=f"{current_user.organization_name or current_user.full_name} открыл сделку «{idea.title}» с бюджетом {budget_formatted}.",
            link_url="/dashboard?tab=projects",
            severity="info",
        )
        db.add(notif)
    except Exception as e:
        print(f"[ORDER IDEA] Notification warning: {e}")

    await db.commit()
    return {"message": "Проект успешно создан", "project_id": project.id, "chat_id": chat.id}


@router.post("/{idea_id}/propose", status_code=status.HTTP_201_CREATED)
async def propose_idea(
    idea_id: int,
    data: IdeaOrderRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Лаборатория отправляет встречное предложение по реализации идеи заказчика."""
    result = await db.execute(select(Idea).where(Idea.id == idea_id))
    idea = result.scalar_one_or_none()
    if not idea:
        raise HTTPException(status_code=404, detail="Идея не найдена")

    if idea.author_id == current_user.id:
        raise HTTPException(status_code=400, detail="Нельзя предлагать реализацию собственной идеи")

    budget_text = f"{data.proposed_budget:,.2f} ₽" if data.proposed_budget else "По договоренности"
    timeline_str = f"Сроки: {data.proposed_timeline}.\n" if data.proposed_timeline else ""
    comment_str = f"Комментарий: {data.proposal_message}" if data.proposal_message else ""
    intro_content = (
        f"Здравствуйте! НИИ «{current_user.organization_name or current_user.full_name}» предлагает реализацию вашей идеи «{idea.title}».\n"
        f"Ориентировочный бюджет: {budget_text}.\n"
        f"{timeline_str}"
        f"{comment_str}"
    )

    chat, is_new = await get_or_create_context_chat(
        db=db,
        investor_id=idea.author_id,
        lab_id=current_user.id,
        context_type="idea_proposal",
        context_id=idea.id,
        title=f"Предложение: {idea.title[:40]}",
        initial_message=intro_content,
        sender_id=current_user.id,
    )

    await db.commit()
    return {"message": "Предложение отправлено, контекстный чат открыт", "chat_id": chat.id}
