from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel, Field


class DepositRequest(BaseModel):
    amount: Decimal = Field(..., gt=0, description="Сумма пополнения баланса")
    payment_method: str = Field("bank_transfer", description="bank_transfer | card")


class WithdrawRequest(BaseModel):
    amount: Decimal = Field(..., gt=0, description="Сумма вывода средств")
    bank_account: str = Field(..., min_length=10, description="Номер расчётного счёта")
    bik: str = Field(..., min_length=9, max_length=9, description="БИК банка")
    recipient_name: str = Field(..., min_length=3, description="Наименование организации или получателя")


class TransactionResponse(BaseModel):
    id: int
    from_user_id: int | None = None
    to_user_id: int | None = None
    project_id: int | None = None
    amount: Decimal
    type: str
    status: str = "completed"
    description: str
    bank_details: dict | None = None
    created_at: datetime

    class Config:
        from_attributes = True


class LedgerResponse(BaseModel):
    available_balance: Decimal
    frozen_balance: Decimal
    total_funded: Decimal = Decimal("0.00")
    transactions: list[TransactionResponse] = []
