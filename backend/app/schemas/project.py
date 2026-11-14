from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel, Field


class ProjectFileResponse(BaseModel):
    id: int
    project_id: int
    uploader_id: int
    file_name: str
    file_path: str
    file_size: int
    mime_type: str
    uploaded_at: datetime

    class Config:
        from_attributes = True


class MilestoneReportRequest(BaseModel):
    raw_report: str = Field(..., min_length=10, description="Текст отчёта НИИ о выполнении этапа")


class GostReportGenerateRequest(BaseModel):
    executors: list[dict] = Field(default_factory=list, description="Список исполнителей [{name, role, degree}]")
    abstract_text: str = Field("", description="Реферат")
    intro_text: str = Field("", description="Введение")
    main_research_text: str = Field(..., min_length=5, description="Основная научно-техническая часть")
    conclusion_text: str = Field("", description="Заключение")
    references: list[str] = Field(default_factory=list, description="Список использованных источников")


class MilestoneResponse(BaseModel):
    id: int
    project_id: int
    step_number: int
    title: str
    amount: Decimal
    status: str
    raw_report: str | None = None
    ai_summary: str | None = None
    gost_structured_data: dict | None = None
    gost_docx_path: str | None = None
    gost_pdf_path: str | None = None

    class Config:
        from_attributes = True


class ProjectResponse(BaseModel):
    id: int
    title: str
    investor_id: int
    lab_id: int
    total_budget: Decimal
    status: str
    created_at: datetime
    investor_name: str | None = None
    lab_name: str | None = None
    milestones: list[MilestoneResponse] = []
    files: list[ProjectFileResponse] = []

    # Синдикация
    is_syndicated: bool = False
    syndication_min_deposit: Decimal = Decimal("0.00")
    syndication_soft_cap: Decimal = Decimal("0.00")
    syndication_status: str = "open"
    syndication_total_raised: Decimal = Decimal("0.00")
    syndicate_members_count: int = 0

    class Config:
        from_attributes = True


class SyndicateEnableRequest(BaseModel):
    syndication_min_deposit: Decimal = Field(..., ge=10000, description="Минимальный взнос соинвестора")
    syndication_soft_cap: Decimal = Field(..., ge=10000, description="Целевой объем софинансирования (Soft Cap)")


class SyndicateJoinRequest(BaseModel):
    amount: Decimal = Field(..., ge=1000, description="Сумма софинансирования на эскроу")
    ip_share_type: str = Field("royalty", description="royalty | patent_co_owner | exclusive_license")


class SyndicateMemberResponse(BaseModel):
    id: int
    project_id: int
    investor_id: int
    investor_name: str | None = None
    organization_name: str | None = None
    invested_amount: Decimal
    share_percent: Decimal
    is_lead: bool
    ip_share_type: str
    joined_at: datetime

    class Config:
        from_attributes = True


class SyndicateCapTableResponse(BaseModel):
    project_id: int
    project_title: str
    total_budget: Decimal
    soft_cap: Decimal
    min_deposit: Decimal
    total_raised: Decimal
    progress_percent: float
    syndication_status: str
    is_lead: bool
    current_user_share: Decimal = Decimal("0.00")
    current_user_invested: Decimal = Decimal("0.00")
    members: list[SyndicateMemberResponse] = []
