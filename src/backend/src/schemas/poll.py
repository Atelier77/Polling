from pydantic import BaseModel, Field, field_validator, ConfigDict
from typing import Optional, List, Generic, TypeVar
from datetime import datetime, timezone
from enum import Enum


class PollStatus(str, Enum):
    ALL = "all"
    ACTIVE = "active"
    EXPIRED = "expired"
    DRAFT = "draft"


class SortField(str, Enum):
    CREATED_AT = "created_at"
    TOTAL_VOTES = "total_votes"
    END_DATE = "end_date"
    TITLE = "title"


class SortOrder(str, Enum):
    ASC = "asc"
    DESC = "desc"


class PollListParams(BaseModel):
    search: Optional[str] = Field(
        None, min_length=1, max_length=100, description="Поиск по названию/описанию"
    )
    status: PollStatus = Field(default=PollStatus.ALL, description="Фильтр по статусу")
    faculty: Optional[str] = Field(
        None, max_length=100, description="Фильтр по факультету создателя"
    )

    sort_by: SortField = Field(
        default=SortField.CREATED_AT, description="Поле для сортировки"
    )
    sort_order: SortOrder = Field(
        default=SortOrder.DESC, description="Порядок сортировки"
    )

    page: int = Field(default=1, ge=1, description="Номер страницы")
    limit: int = Field(default=10, ge=1, le=100, description="Записей на страницу")

    @field_validator("search")
    @classmethod
    def sanitize_search(cls, v: Optional[str]) -> Optional[str]:
        if v:
            return v.replace("%", r"\%").replace("_", r"\_").strip()
        return v


class OptionCreate(BaseModel):
    text: str = Field(
        ..., min_length=1, max_length=500, description="Текст варианта ответа"
    )

    @field_validator("text")
    @classmethod
    def validate_text(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Текст варианта ответа не может быть пустым")
        return v.strip()


class PollCreate(BaseModel):
    title: str = Field(..., min_length=5, max_length=200, description="Название опроса")
    description: str = Field(
        ..., min_length=10, max_length=1000, description="Описание опроса"
    )
    end_date: datetime = Field(..., description="Дата и время окончания опроса")
    options: List[OptionCreate] = Field(
        ..., min_length=2, description="Варианты ответов (минимум 2)"
    )

    @field_validator("end_date", mode="before")
    @classmethod
    def validate_end_date(cls, v):
        if v is None:
            return v

        if isinstance(v, str):
            v = v.replace("Z", "+00:00")
            try:
                v = datetime.fromisoformat(v)
            except ValueError:
                v = datetime.strptime(v[:19], "%Y-%m-%dT%H:%M:%S")
                v = v.replace(tzinfo=timezone.utc)

        if hasattr(v, "tzinfo") and v.tzinfo is None:
            v = v.replace(tzinfo=timezone.utc)

        now = datetime.now(timezone.utc)
        if v <= now:
            raise ValueError("Дата окончания должна быть в будущем")

        return v

    @field_validator("options")
    @classmethod
    def validate_options(cls, v: List[OptionCreate]) -> List[OptionCreate]:
        if len(v) < 2:
            raise ValueError("Должно быть минимум 2 варианта ответа")

        texts = [opt.text.lower().strip() for opt in v]
        if len(texts) != len(set(texts)):
            raise ValueError("Варианты ответов должны быть уникальными")

        return v


class PollUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=5, max_length=200)
    description: Optional[str] = Field(None, min_length=10, max_length=1000)
    end_date: Optional[datetime] = None

    @field_validator("end_date", mode="before")
    @classmethod
    def validate_end_date(cls, v):
        if v is None:
            return v

        if isinstance(v, str):
            v = v.replace("Z", "+00:00")
            try:
                v = datetime.fromisoformat(v)
            except ValueError:
                v = datetime.strptime(v[:19], "%Y-%m-%dT%H:%M:%S")
                v = v.replace(tzinfo=timezone.utc)

        if hasattr(v, "tzinfo") and v.tzinfo is None:
            v = v.replace(tzinfo=timezone.utc)

        now = datetime.now(timezone.utc)
        if v <= now:
            raise ValueError("Дата окончания должна быть в будущем")

        return v


class OptionResponse(BaseModel):
    id: int
    text: str
    votes: int = 0

    model_config = ConfigDict(from_attributes=True)


class PollResponse(BaseModel):
    id: int
    title: str
    description: str
    end_date: datetime
    total_votes: int = 0
    created_at: datetime
    options: Optional[List[OptionResponse]] = None
    banner_file_id: Optional[int] = None
    banner_url: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class OptionResult(BaseModel):
    id: int
    text: str = ""
    votes: int = 0
    percentage: float = 0.0

    model_config = ConfigDict(from_attributes=True)


class PollResultsResponse(BaseModel):
    poll_id: int
    title: str
    description: str
    total_votes: int = 0
    end_date: datetime
    created_at: datetime
    has_ended: bool = False
    options: List[dict] = Field(
        default_factory=list, description="Варианты с процентами"
    )

    model_config = ConfigDict(from_attributes=True)


T = TypeVar("T")


class PaginatedResponse(BaseModel, Generic[T]):
    items: List[T]
    total: int
    page: int
    limit: int
    pages: int

    @field_validator("pages")
    @classmethod
    def validate_pages(cls, v: int, info) -> int:
        if v < 0:
            raise ValueError("Количество страниц не может быть отрицательным")
        return v

    model_config = ConfigDict(from_attributes=True)


class PollStats(BaseModel):
    total_polls: int
    active_polls: int
    expired_polls: int
    total_votes: int

    model_config = ConfigDict(from_attributes=True)


class PollBrief(BaseModel):
    id: int
    title: str
    end_date: datetime
    total_votes: int
    is_active: bool

    model_config = ConfigDict(from_attributes=True)


class BannerUpdateRequest(BaseModel):
    banner_file_id: int
