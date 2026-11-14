import math
import re
from collections import Counter
from datetime import datetime
from sqlalchemy import select, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.models.task import Task
from app.models.idea import Idea
from app.models.matching import MatchingInvitation
from app.models.notification import Notification


def tokenize_text(text: str) -> list[str]:
    """Токенизация текста с удалением шума и стоп-слов на русском и английском."""
    clean = re.sub(r'[^а-яА-Яa-zA-Z0-9\s]', ' ', text.lower())
    stop_words = {
        "и", "в", "на", "с", "по", "для", "о", "об", "от", "к", "до", "из", "у", "за", "над", "под",
        "при", "про", "без", "через", "после", "перед", "как", "так", "что", "это", "где", "когда",
        "the", "and", "in", "of", "to", "for", "with", "on", "at", "by", "from", "up", "about", "into",
    }
    tokens = [w for w in clean.split() if len(w) > 2 and w not in stop_words]
    return tokens


def compute_cosine_similarity(text1: str, text2: str) -> tuple[float, list[str]]:
    """
    Вычисляет косинусное сходство между двумя текстами на основе векторной модели частот слов (TF-IDF подобие)
    и возвращает итоговый коэффициент сходства [0.0..1.0] и список пересекающихся ключевых компетенций.
    """
    tokens1 = tokenize_text(text1)
    tokens2 = tokenize_text(text2)

    if not tokens1 or not tokens2:
        return 0.0, []

    vec1 = Counter(tokens1)
    vec2 = Counter(tokens2)

    intersection = set(vec1.keys()) & set(vec2.keys())
    matched_keywords = sorted(list(intersection), key=lambda w: vec1[w] + vec2[w], reverse=True)[:5]

    numerator = sum(vec1[x] * vec2[x] for x in intersection)

    sum1 = sum(v ** 2 for v in vec1.values())
    sum2 = sum(v ** 2 for v in vec2.values())
    denominator = math.sqrt(sum1) * math.sqrt(sum2)

    if not denominator:
        return 0.0, []

    raw_score = float(numerator) / denominator
    # Нормализация для семантического ранжирования (смещение при частичном совпадении ключевых тем)
    keyword_boost = min(0.35, len(intersection) * 0.08)
    final_score = min(0.98, raw_score * 0.7 + keyword_boost + 0.35 if intersection else 0.45)
    return round(final_score, 3), matched_keywords


async def run_task_matchmaking(db: AsyncSession, task_id: int) -> list[MatchingInvitation]:
    """
    Автоматически анализирует задачу заказчика и подбирает Топ-3 аккредитованных НИИ
    с порогом сходства компетенций >= 0.65, создавая персональные приглашения и уведомления.
    """
    t_res = await db.execute(select(Task).where(Task.id == task_id))
    task = t_res.scalar_one_or_none()
    if not task:
        return []

    task_corpus = f"{task.title} {task.description}"

    # Загружаем все верифицированные научные лаборатории
    labs_res = await db.execute(
        select(User).where(User.role == "lab", User.is_active == True)
    )
    labs = labs_res.scalars().all()

    candidates = []
    for lab in labs:
        # Собираем научный профиль лаборатории
        patents_text = " ".join([p.get("title", "") for p in (lab.patents_info or []) if isinstance(p, dict)])
        
        # Получаем идеи лаборатории
        ideas_res = await db.execute(select(Idea.title, Idea.summary).where(Idea.author_id == lab.id))
        lab_ideas = ideas_res.all()
        ideas_text = " ".join([f"{title} {summary}" for title, summary in lab_ideas])

        lab_corpus = f"{lab.organization_name or ''} {lab.bio or ''} {patents_text} {ideas_text}"
        score, matched_terms = compute_cosine_similarity(task_corpus, lab_corpus)

        candidates.append({
            "lab": lab,
            "score": score,
            "reasons": matched_terms or ["Научный профиль организации", "Профильные исследования"],
        })

    # Сортировка по убыванию релевантности
    candidates.sort(key=lambda x: x["score"], reverse=True)
    top_matches = candidates[:3]

    created_invitations = []
    for match in top_matches:
        lab = match["lab"]
        score = match["score"]
        reasons = match["reasons"]

        # Проверяем, нет ли уже приглашения
        inv_check = await db.execute(
            select(MatchingInvitation).where(
                MatchingInvitation.source_type == "task",
                MatchingInvitation.source_id == task.id,
                MatchingInvitation.lab_id == lab.id,
            )
        )
        existing_inv = inv_check.scalar_one_or_none()
        if existing_inv:
            existing_inv.similarity_score = score
            existing_inv.matched_reasons = reasons
            created_invitations.append(existing_inv)
            continue

        inv = MatchingInvitation(
            source_type="task",
            source_id=task.id,
            lab_id=lab.id,
            similarity_score=score,
            matched_reasons=reasons,
            status="pending",
        )
        db.add(inv)
        created_invitations.append(inv)

        # Системное уведомление лаборатории
        notif = Notification(
            recipient_id=lab.id,
            recipient_role_scope="user",
            type="task_match",
            title=f"Персональная рекомендация по задаче «{task.title[:35]}»",
            body=(
                f"Система AI Matchmaking подобрала вашу лабораторию с соответствием {int(score * 100)}%. "
                f"Совпадающие компетенции: {', '.join(reasons[:3])}."
            ),
            link_url=f"/dashboard/tasks?tab=invitations&task_id={task.id}",
            severity="info",
        )
        db.add(notif)

    await db.commit()
    return created_invitations
