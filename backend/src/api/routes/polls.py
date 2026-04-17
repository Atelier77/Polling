# # backend/src/api/routes/polls.py
# from fastapi import APIRouter, HTTPException, status, Depends, Query
# from sqlalchemy.ext.asyncio import AsyncSession
# from typing import Annotated, List

# from src.models.poll import PollResponse, PollCreate, PollResults
# from src.queries.polls import (
#     get_all_polls, 
#     get_poll_by_id, 
#     get_poll_results, 
#     create_poll
# )
# from src.api.dependencies import DatabaseDep, CurrentUser, CurrentAdmin

# router = APIRouter()

# @router.get("/", response_model=List[PollResponse])
# async def get_polls(
#     db: DatabaseDep,
#     skip: int = Query(0, ge=0, description="Сколько записей пропустить"),
#     limit: int = Query(100, ge=1, le=100, description="Лимит записей")
# ):
#     """
#     Получить список всех активных опросов
#     """
#     try:
#         polls = await get_all_polls(db)
#         return polls[skip:skip + limit]
#     except Exception as e:
#         raise HTTPException(
#             status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
#             detail=f"Ошибка при получении опросов: {str(e)}"
#         )

# @router.get("/{poll_id}", response_model=PollResponse)
# async def get_poll(
#     poll_id: int,
#     db: DatabaseDep
# ):
#     """
#     Получить опрос по ID
#     """
#     poll = await get_poll_by_id(db, poll_id)
#     if not poll:
#         raise HTTPException(
#             status_code=status.HTTP_404_NOT_FOUND,
#             detail="Опрос не найден"
#         )
#     return poll

# @router.get("/{poll_id}/results", response_model=PollResults)
# async def get_poll_results(
#     poll_id: int,
#     db: DatabaseDep
# ):
#     """
#     Получить результаты опроса
#     """
#     results = await get_poll_results(db, poll_id)
#     if not results:
#         raise HTTPException(
#             status_code=status.HTTP_404_NOT_FOUND,
#             detail="Опрос не найден"
#         )
#     return results


# @router.post("/", response_model=PollResponse, status_code=status.HTTP_201_CREATED)
# async def create_new_poll(
#     poll: PollCreate,
#     db: DatabaseDep,
#     admin_id: CurrentAdmin  # ← Используем dependency для админов
# ):
#     """
#     Создать новый опрос (только для администраторов)
#     """
#     try:
#         # Логирование
#         print(f"Администратор {admin_id} создает новый опрос: {poll.title}")
        
#         return await create_poll(db, poll)
        
#     except Exception as e:
#         raise HTTPException(
#             status_code=status.HTTP_400_BAD_REQUEST,
#             detail=f"Ошибка при создании опроса: {str(e)}"
#         )

from fastapi import APIRouter, HTTPException, status, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_, desc, asc
from datetime import datetime
from typing import List, Optional

from src.database.connection import get_db
from src.models.poll import Poll, Option
from src.models.vote import Vote
from src.schemas.poll import (
    PollCreate, 
    PollResponse, 
    PollListParams, 
    PaginatedResponse,
    PollResultsResponse,
    PollUpdate
)
from src.api.dependencies import DatabaseDep, CurrentUser, CurrentAdmin

router = APIRouter()

@router.get("/")
async def get_polls(
    db: DatabaseDep,
    current_user: CurrentUser,
    params: PollListParams = Depends(),
):
    """
    Получить список опросов с фильтрацией, поиском, сортировкой и пагинацией
    """
    try:
        query = select(Poll).options(
        )
        
        if params.status == "active":
            query = query.where(Poll.end_date > datetime.utcnow())
        elif params.status == "expired":
            query = query.where(Poll.end_date <= datetime.utcnow())
        
        if params.search:
            search_term = f"%{params.search}%"
            query = query.where(
                or_(
                    Poll.title.ilike(search_term),
                    Poll.description.ilike(search_term)
                )
            )
        
        sort_column = {
            "created_at": Poll.created_at,
            "total_votes": Poll.total_votes,
            "end_date": Poll.end_date,
            "title": Poll.title,
        }.get(params.sort_by, Poll.created_at)
        
        if params.sort_order == "asc":
            query = query.order_by(asc(sort_column))
        else:
            query = query.order_by(desc(sort_column))
        
        count_query = select(func.count()).select_from(query.subquery())
        total_result = await db.execute(count_query)
        total = total_result.scalar() or 0
        
        offset = (params.page - 1) * params.limit
        query = query.offset(offset).limit(params.limit)
        
        result = await db.execute(query)
        polls = result.scalars().all()
        
        poll_responses = []
        for poll in polls:
            options_result = await db.execute(
                select(Option).where(Option.poll_id == poll.id)
            )
            options = options_result.scalars().all()
            
            poll_responses.append(PollResponse(
                id=poll.id,
                title=poll.title,
                description=poll.description,
                end_date=poll.end_date,
                total_votes=poll.total_votes,
                created_at=poll.created_at,
                options=[
                    {"id": opt.id, "text": opt.text, "votes": opt.votes}
                    for opt in options
                ]
            ))
        
        return PaginatedResponse(
            items=poll_responses,
            total=total,
            page=params.page,
            limit=params.limit,
            pages=(total + params.limit - 1) // params.limit
        )
        
    except Exception as e:
        print(f"Error getting polls: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ошибка при получении опросов: {str(e)}"
        )

# ========== CREATE POLL ==========
@router.post("/", response_model=PollResponse, status_code=status.HTTP_201_CREATED)
async def create_new_poll(
    poll_data: PollCreate,
    db: DatabaseDep,
    admin_id: CurrentAdmin
):

    """
    Создать новый опрос (только для администраторов)
    """
    print(f"=== CREATE POLL REQUEST ===")
    print(f"Admin ID: {admin_id}")
    print(f"Poll data: {poll_data}")
    
    try:
        # Валидация входных данных
        if not poll_data.get("title") or not isinstance(poll_data["title"], str):
            return {
                "success": False,
                "error": "Заголовок обязателен и должен быть строкой"
            }
        
        options = poll_data.get("options", [])
        if not options or not isinstance(options, list) or len(options) < 1:
            return {
                "success": False,
                "error": "Должен быть хотя бы один вариант ответа"
            }
        
        if poll_data.end_date <= datetime.utcnow():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Дата окончания должна быть в будущем"
            )
        
        exists = await db.execute(
        select(Poll).where(Poll.title == poll_data.title)
    )
        if exists.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Опрос с таким названием уже существует"
            )
        
        poll = Poll(
            title=poll_data["title"],
            description=poll_data.get("description", ""),
            end_date=poll_data.get("end_date") or datetime.now() + timedelta(days=7),
            total_votes=0
        )
        
        db.add(poll)
        await db.flush()
        
        created_options = []
        for option_text in options:
            option = Option(
                poll_id=poll.id,
                text=str(option_text),
                votes=0
            )
            db.add(option)
            created_options.append(option)
        
        await db.commit()
        await db.refresh(poll)
        
        options_result = await db.execute(
            select(Option).where(Option.poll_id == poll.id)
        )
        options = options_result.scalars().all()
        
        return PollResponse(
            id=poll.id,
            title=poll.title,
            description=poll.description,
            end_date=poll.end_date,
            total_votes=poll.total_votes,
            created_at=poll.created_at,
            options=[
                {"id": opt.id, "text": opt.text, "votes": opt.votes}
                for opt in options
            ]
        )
        
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        print(f"Error creating poll: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ошибка при создании опроса: {str(e)}"
        )
    

@router.get("/{poll_id}", response_model=PollResponse)
async def get_poll(
    poll_id: int,
    db: DatabaseDep,
    current_user: CurrentUser
):
    """
    Получить опрос по ID
    """
    try:
        result = await db.execute(
            select(Poll).where(Poll.id == poll_id)
        )
        poll = result.scalar_one_or_none()
        
        if not poll:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Опрос не найден"
            )
        
        options_result = await db.execute(
            select(Option).where(Option.poll_id == poll_id)
        )
        options = options_result.scalars().all()
        
        return PollResponse(
            id=poll.id,
            title=poll.title,
            description=poll.description,
            end_date=poll.end_date,
            total_votes=poll.total_votes,
            created_at=poll.created_at,
            options=[
                {"id": opt.id, "text": opt.text, "votes": opt.votes}
                for opt in options
            ]
        )
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error getting poll {poll_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ошибка при получении опроса: {str(e)}"
        )

@router.get("/{poll_id}/results", response_model=PollResultsResponse)
async def get_poll_results(
    poll_id: int,
    db: DatabaseDep,
    current_user: CurrentUser
):
    """
    Получить результаты опроса с процентами
    """
    try:
        # 1. Проверяем существование опроса
        poll_result = await db.execute(
            select(Poll).where(Poll.id == poll_id)
        )
        poll = poll_result.scalar_one_or_none()
        
        if not poll:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Опрос не найден"
            )
        
        options_result = await db.execute(
            select(Option).where(Option.poll_id == poll_id).order_by(Option.votes.desc())
        )
        options = options_result.scalars().all()
        
        total_votes = poll.total_votes or 1
        options_with_percents = []
        
        for option in options:
            percentage = (option.votes / total_votes) * 100 if total_votes > 0 else 0
            
            options_with_percents.append({
                "id": option.id,
                "text": option.text,
                "votes": option.votes,
                "percentage": round(percentage, 2)
            })
        
        return PollResultsResponse(
            poll_id=poll.id,
            title=poll.title,
            description=poll.description,
            total_votes=poll.total_votes,
            end_date=poll.end_date,
            created_at=poll.created_at,
            options=options_with_percents,
            has_ended=poll.end_date < datetime.utcnow() if poll.end_date else False
        )
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error getting poll results {poll_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ошибка при получении результатов: {str(e)}"
        )
    

@router.put("/{poll_id}", response_model=PollResponse)
async def update_poll(
    poll_id: int,
    poll_data: PollUpdate,
    db: DatabaseDep,
    admin_id: CurrentAdmin
):
    """Обновление опроса (только админ)"""
    poll = await db.get(Poll, poll_id)
    if not poll:
        raise HTTPException(status_code=404, detail="Опрос не найден")
    
    update_data = poll_data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(poll, key, value)
    
    await db.commit()
    await db.refresh(poll)
    return PollResponse.model_validate(poll)



@router.get("/active")
async def get_active_polls(
    db: DatabaseDep
):
    """
    Получить только активные опросы (еще не завершившиеся)
    """
    try:
        current_time = datetime.now()
        
        result = await db.execute(
            select(Poll)
            .where(Poll.end_date > current_time)
            .order_by(Poll.created_at.desc())
        )
        polls = result.scalars().all()
        
        active_polls = []
        for poll in polls:
            options_result = await db.execute(
                select(Option).where(Option.poll_id == poll.id)
            )
            options = options_result.scalars().all()
            
            poll_dict = {
                "id": poll.id,
                "title": poll.title,
                "description": poll.description,
                "end_date": poll.end_date.isoformat(),
                "total_votes": poll.total_votes,
                "created_at": poll.created_at.isoformat(),
                "options": [
                    {
                        "id": opt.id,
                        "text": opt.text,
                        "votes": opt.votes
                    }
                    for opt in options
                ],
                "is_active": True
            }
            active_polls.append(poll_dict)
        
        return active_polls
        
    except Exception as e:
        print(f"Error getting active polls: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ошибка при получении активных опросов: {str(e)}"
        )
    
@router.delete("/{poll_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_poll(
    poll_id: int,
    db: DatabaseDep,
    admin_id: CurrentAdmin
):
    """Удаление опроса (только админ)"""
    poll = await db.get(Poll, poll_id)
    if not poll:
        raise HTTPException(status_code=404, detail="Опрос не найден")
    
    votes_count = await db.execute(
        select(func.count()).select_from(Vote).where(Vote.poll_id == poll_id)
    )
    if votes_count.scalar() > 0:
        raise HTTPException(status_code=409, detail="Нельзя удалить опрос с голосами")
    
    await db.delete(poll)
    await db.commit()
    return None