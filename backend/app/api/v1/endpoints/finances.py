from datetime import datetime
import hashlib
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.models.finance import Account, Transaction
from app.models.notification import Notification
from app.schemas.finance import LedgerResponse, DepositRequest, WithdrawRequest, TransactionResponse

router = APIRouter()

PLATFORM_REQUISITES = {
    "organization": "ООО «ТОЧКА РОСТА» (Платформа трансфера технологий)",
    "inn": "7701982345",
    "kpp": "770101001",
    "account": "40702810400000012345",
    "bank_name": "АО «Т-Банк» г. Москва",
    "bik": "044525974",
    "corr_account": "30101810145250000974",
    "nds": "Без НДС (УСН, ст. 346.11 НК РФ)",
}


@router.get("/ledger", response_model=LedgerResponse)
async def get_ledger(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    acc_res = await db.execute(select(Account).where(Account.user_id == current_user.id))
    account = acc_res.scalar_one_or_none()
    if not account:
        account = Account(user_id=current_user.id, available_balance=Decimal("0.00"), frozen_balance=Decimal("0.00"))
        db.add(account)
        await db.commit()
        await db.refresh(account)

    tx_res = await db.execute(
        select(Transaction)
        .where(or_(Transaction.from_user_id == current_user.id, Transaction.to_user_id == current_user.id))
        .order_by(Transaction.id.desc())
    )
    transactions = [TransactionResponse.model_validate(tx) for tx in tx_res.scalars().all()]

    # Подсчет общего объема профинансированных проектов
    total_funded = sum(
        tx.amount for tx in transactions if tx.type == "escrow_lock" and tx.from_user_id == current_user.id
    )

    return LedgerResponse(
        available_balance=account.available_balance,
        frozen_balance=account.frozen_balance,
        total_funded=total_funded,
        transactions=transactions,
    )


@router.get("/account")
async def get_account(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Возвращает баланс и данные гарантийного счета текущего пользователя."""
    acc_res = await db.execute(select(Account).where(Account.user_id == current_user.id))
    account = acc_res.scalar_one_or_none()
    if not account:
        account = Account(user_id=current_user.id, available_balance=Decimal("0.00"), frozen_balance=Decimal("0.00"))
        db.add(account)
        await db.commit()
        await db.refresh(account)

    return {
        "id": account.id,
        "user_id": account.user_id,
        "available_balance": float(account.available_balance),
        "frozen_balance": float(account.frozen_balance),
    }


@router.get("/invoice-preview")
async def get_invoice_preview(
    amount: Decimal = Query(..., gt=0),
    current_user: User = Depends(get_current_user),
):
    """Генерирует реквизиты официального счёта на оплату для безналичного перевода юрлицом."""
    now = datetime.now()
    invoice_number = f"ТР-{now.strftime('%y%m%d')}-{current_user.id:04d}"
    payer_name = current_user.organization_name or current_user.full_name
    payer_inn = current_user.inn or "Не указан"
    purpose = f"Пополнение гарантийного депозита л/с #{current_user.id} на платформе «Точка Роста». Без НДС."

    # Строка по стандарту ГОСТ Р 56042-2014 для платежных QR-кодов
    qr_payload = (
        f"ST00012|Name={PLATFORM_REQUISITES['organization']}|"
        f"PersonalAcc={PLATFORM_REQUISITES['account']}|"
        f"BankName={PLATFORM_REQUISITES['bank_name']}|"
        f"BIC={PLATFORM_REQUISITES['bik']}|"
        f"CorrespAcc={PLATFORM_REQUISITES['corr_account']}|"
        f"PayeeINN={PLATFORM_REQUISITES['inn']}|"
        f"KPP={PLATFORM_REQUISITES['kpp']}|"
        f"Purpose={purpose}|"
        f"Sum={int(amount * 100)}"
    )

    return {
        "invoice_number": invoice_number,
        "date": now.strftime("%d.%m.%Y"),
        "supplier": PLATFORM_REQUISITES,
        "customer": {
            "name": payer_name,
            "inn": payer_inn,
            "representative": current_user.representative_name or current_user.full_name,
        },
        "amount": amount,
        "purpose": purpose,
        "qr_payload": qr_payload,
    }


@router.post("/deposit", status_code=status.HTTP_200_OK)
async def make_deposit(
    data: DepositRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if data.amount <= 0:
        raise HTTPException(status_code=400, detail="Сумма должна быть больше 0")

    acc_res = await db.execute(select(Account).where(Account.user_id == current_user.id))
    account = acc_res.scalar_one_or_none()
    if not account:
        account = Account(user_id=current_user.id, available_balance=Decimal("0.00"), frozen_balance=Decimal("0.00"))
        db.add(account)

    account.available_balance += data.amount

    method_name = "Безналичный платёж (Р/С)" if data.payment_method == "bank_transfer" else "Корпоративная карта"
    tx = Transaction(
        from_user_id=None,
        to_user_id=current_user.id,
        project_id=None,
        amount=data.amount,
        type="deposit",
        status="completed",
        description=f"Пополнение баланса аккаунта ({method_name})",
        bank_details={"payment_method": data.payment_method},
    )
    db.add(tx)
    await db.commit()

    return {
        "message": f"Баланс успешно пополнен на {data.amount:,.2f} ₽".replace(",", " "),
        "available_balance": account.available_balance,
        "frozen_balance": account.frozen_balance,
    }


@router.post("/withdraw", status_code=status.HTTP_200_OK)
async def request_withdraw(
    data: WithdrawRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if data.amount <= 0:
        raise HTTPException(status_code=400, detail="Сумма вывода должна быть больше 0")

    # Валидация реквизитов
    clean_account = data.bank_account.strip().replace(" ", "")
    clean_bik = data.bik.strip().replace(" ", "")
    if len(clean_account) != 20 or not clean_account.isdigit():
        raise HTTPException(status_code=400, detail="Расчётный счёт должен содержать ровно 20 цифр")
    if len(clean_bik) != 9 or not clean_bik.isdigit():
        raise HTTPException(status_code=400, detail="БИК банка должен содержать ровно 9 цифр")

    acc_res = await db.execute(select(Account).where(Account.user_id == current_user.id))
    account = acc_res.scalar_one_or_none()
    if not account or account.available_balance < data.amount:
        raise HTTPException(status_code=400, detail="Недостаточно доступных средств для вывода")

    account.available_balance -= data.amount

    bank_details = {
        "recipient_name": data.recipient_name.strip(),
        "bank_account": clean_account,
        "bik": clean_bik,
        "created_at": datetime.utcnow().isoformat(),
    }

    tx = Transaction(
        from_user_id=current_user.id,
        to_user_id=None,
        project_id=None,
        amount=data.amount,
        type="payout",
        status="pending",
        description=f"Заявка на вывод: {data.amount:,.2f} ₽ на р/с {clean_account} (БИК {clean_bik}, {data.recipient_name})".replace(",", " "),
        bank_details=bank_details,
    )
    db.add(tx)
    await db.commit()

    return {
        "message": f"Заявка на вывод {data.amount:,.2f} ₽ сформирована и ожидает подтверждения банком".replace(",", " "),
        "available_balance": account.available_balance,
        "frozen_balance": account.frozen_balance,
    }


@router.post("/transactions/{transaction_id}/demo-approve")
async def demo_approve_payout(
    transaction_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Демо-функция: мгновенно подтверждает и исполняет заявку на вывод средств."""
    tx_res = await db.execute(select(Transaction).where(Transaction.id == transaction_id))
    tx = tx_res.scalar_one_or_none()
    if not tx:
        raise HTTPException(status_code=404, detail="Транзакция не найдена")

    tx.status = "completed"

    try:
        notif = Notification(
            recipient_id=tx.from_user_id or current_user.id,
            type="payout_completed",
            title="Вывод средств подтверждён!",
            body=f"Заявка на перевод {tx.amount:,.2f} ₽ успешно исполнена банком.",
            link_url="/dashboard?tab=finances",
            severity="info",
        )
        db.add(notif)
    except Exception as e:
        print(f"[DEMO PAYOUT] Notification warning: {e}")

    await db.commit()
    return {"message": "Выплата подтверждена (DEMO)", "transaction_id": tx.id}


from fastapi.responses import Response
from app.services.receipt_service import generate_receipt_pdf

@router.get("/transactions/{tx_id}/receipt")
async def get_transaction_receipt(
    tx_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Генерирует официальное подтверждение совершения банковского перевода / платёжное поручение."""
    res = await db.execute(select(Transaction).where(Transaction.id == tx_id))
    tx = res.scalar_one_or_none()
    if not tx:
        raise HTTPException(status_code=404, detail="Транзакция не найдена")

    # Проверка доступа: только участники или админ
    if not current_user.is_admin and tx.from_user_id != current_user.id and tx.to_user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Доступ к документу перевода запрещён")

    payer_name = "ООО «ТОЧКА РОСТА» (Эскроу-счёт)"
    payer_inn = "7701982345"
    recipient_name = current_user.organization_name or current_user.full_name
    recipient_inn = current_user.inn or "Не указан"

    if tx.from_user_id:
        f_res = await db.execute(select(User).where(User.id == tx.from_user_id))
        from_u = f_res.scalar_one_or_none()
        if from_u:
            payer_name = from_u.organization_name or from_u.full_name
            payer_inn = from_u.inn or "Физлицо"

    if tx.to_user_id:
        t_res = await db.execute(select(User).where(User.id == tx.to_user_id))
        to_u = t_res.scalar_one_or_none()
        if to_u:
            recipient_name = to_u.organization_name or to_u.full_name
            recipient_inn = to_u.inn or "Физлицо"

    return {
        "success": True,
        "receipt_number": f"ТР-ПП-{tx.id:06d}",
        "transaction_id": tx.id,
        "date": tx.created_at.strftime("%d.%m.%Y в %H:%M:%S MSK") if tx.created_at else "Дата не указана",
        "status": "ПОДТВЕРЖДЕНО И ИСПОЛНЕНО",
        "operation_type": tx.type,
        "operation_label": (
            "Пополнение гарантийного счёта" if tx.type == "deposit"
            else "Выплата вознаграждения / прибыли" if tx.type == "profit_payout"
            else "Блокировка средств на эскроу-депозите" if tx.type == "escrow_lock"
            else "Исполнение и приёмка этапа НИОКР" if tx.type == "escrow_release"
            else "Вывод средств на расчётный счёт" if tx.type == "payout"
            else "Финансовый перевод"
        ),
        "amount": tx.amount,
        "amount_formatted": f"{tx.amount:,.2f} ₽".replace(",", " "),
        "currency": "RUB",
        "payer": {
            "name": payer_name,
            "inn": payer_inn,
        },
        "recipient": {
            "name": recipient_name,
            "inn": recipient_inn,
            "bank_details": tx.bank_details or {},
        },
        "purpose": tx.description or "Исполнение обязательств по соглашению на платформе «Точка Роста»",
        "operator": PLATFORM_REQUISITES,
    }


@router.get("/transactions/{tx_id}/receipt/pdf")
async def get_transaction_receipt_pdf(
    tx_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Формирует и отдает официальный PDF-чек перевода."""
    res = await db.execute(select(Transaction).where(Transaction.id == tx_id))
    tx = res.scalar_one_or_none()
    if not tx:
        raise HTTPException(status_code=404, detail="Транзакция не найдена")

    if not current_user.is_admin and tx.from_user_id != current_user.id and tx.to_user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Доступ к документу перевода запрещён")

    payer_name = "ООО «ТОЧКА РОСТА» (Эскроу-счёт)"
    payer_inn = "7701982345"
    recipient_name = current_user.organization_name or current_user.full_name
    recipient_inn = current_user.inn or "Не указан"

    if tx.from_user_id:
        f_res = await db.execute(select(User).where(User.id == tx.from_user_id))
        from_u = f_res.scalar_one_or_none()
        if from_u:
            payer_name = from_u.organization_name or from_u.full_name
            payer_inn = from_u.inn or "Физлицо"

    if tx.to_user_id:
        t_res = await db.execute(select(User).where(User.id == tx.to_user_id))
        to_u = t_res.scalar_one_or_none()
        if to_u:
            recipient_name = to_u.organization_name or to_u.full_name
            recipient_inn = to_u.inn or "Физлицо"

    operation_label = (
        "Пополнение гарантийного счёта" if tx.type == "deposit"
        else "Выплата вознаграждения / прибыли" if tx.type == "profit_payout"
        else "Блокировка средств на эскроу-депозите" if tx.type == "escrow_lock"
        else "Исполнение и приёмка этапа НИОКР" if tx.type == "escrow_release"
        else "Вывод средств на расчётный счёт" if tx.type == "payout"
        else "Финансовый перевод"
    )

    pdf_bytes = generate_receipt_pdf(
        tx_id=tx.id,
        amount=tx.amount,
        operation_label=operation_label,
        payer_name=payer_name,
        payer_inn=payer_inn,
        recipient_name=recipient_name,
        recipient_inn=recipient_inn,
        purpose=tx.description or "Исполнение обязательств по соглашению на платформе «Точка Роста»",
        created_at=tx.created_at or datetime.utcnow(),
    )

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="receipt_{tx.id}.pdf"',
            "Content-Type": "application/pdf",
        },
    )
