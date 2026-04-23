from fastapi import APIRouter, HTTPException, status, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_, desc, asc
from datetime import datetime
from typing import List, Optional
from src.services.file_service import FileService

from src.database.connection import get_db
from src.models.poll import Poll, Option
from src.models.vote import Vote
from src.models.file import FileMetadata
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
            
            banner_url = None
            if poll.banner_file_id:
                file_meta = await db.get(FileMetadata, poll.banner_file_id)
                if file_meta:
                    file_service = FileService()
                    banner_url = file_service.get_download_url(file_meta.file_key)

            poll_responses.append(PollResponse(
                id=poll.id,
                title=poll.title,
                description=poll.description,
                end_date=poll.end_date,
                total_votes=poll.total_votes,
                created_at=poll.created_at,
                banner_file_id=poll.banner_file_id,
                banner_url=banner_url, 
                options=[
                    {"id": opt.id, "text": str(opt.text), "votes": opt.votes}
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
    try:
        if not poll_data.title or not isinstance(poll_data.title, str):
            raise HTTPException(400, "Заголовок обязателен")
        
        options = poll_data.options
        if not options or len(options) < 2:
            raise HTTPException(400, "Должно быть минимум 2 варианта ответа")
        
        if poll_data.end_date <= datetime.utcnow():
            raise HTTPException(400, "Дата окончания должна быть в будущем")
        
        exists = await db.execute(select(Poll).where(Poll.title == poll_data.title))
        if exists.scalar_one_or_none():
            raise HTTPException(409, "Опрос с таким названием уже существует")
        
        poll = Poll(
            title=poll_data.title,
            description=poll_data.description,
            end_date=poll_data.end_date,
            total_votes=0
        )
        db.add(poll)
        await db.flush()
        
        for option_data in poll_data.options:
            option = Option(
                poll_id=poll.id,
                text=str(option_data.text),
                votes=0
            )
            db.add(option)
        
        await db.commit()
        await db.refresh(poll)
        
        options_result = await db.execute(
            select(Option).where(Option.poll_id == poll.id)
        )
        options_list = options_result.scalars().all()
        
        return PollResponse(
            id=poll.id,
            title=poll.title,
            description=poll.description,
            end_date=poll.end_date,
            total_votes=poll.total_votes,
            created_at=poll.created_at,
            options=[
                {"id": opt.id, "text": opt.text, "votes": opt.votes}
                for opt in options_list
            ]
        )
        
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        print(f"Error creating poll: {str(e)}")
        raise HTTPException(500, f"Ошибка при создании опроса: {str(e)}")
    


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

        banner_url = None
        if poll.banner_file_id:
            file_meta = await db.get(FileMetadata, poll.banner_file_id)
            if file_meta:
                file_service = FileService()
                banner_url = file_service.get_download_url(file_meta.file_key)
        
        return PollResponse(
            id=poll.id,
            title=poll.title,
            description=poll.description,
            end_date=poll.end_date,
            total_votes=poll.total_votes,
            created_at=poll.created_at,
            banner_file_id=poll.banner_file_id,
            banner_url=banner_url,
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

@router.put("/{poll_id}/banner")
async def update_poll_banner(
    poll_id: int,
    banner_data: dict,
    db: DatabaseDep,
    current_admin: CurrentAdmin
):
    """Привязать баннер к опросу"""
    try:
        banner_file_id = banner_data.get("banner_file_id")
        
        if not banner_file_id:
            raise HTTPException(400, detail="banner_file_id обязателен")
        
        from src.models.file import FileMetadata
        file_meta = await db.get(FileMetadata, banner_file_id)
        if not file_meta:
            raise HTTPException(404, detail=f"Файл {banner_file_id} не найден")
        
        poll = await db.get(Poll, poll_id)
        if not poll:
            raise HTTPException(404, detail=f"Опрос {poll_id} не найден")
        
        print(f"🔗 Привязываем файл {banner_file_id} к опросу {poll_id}")
        poll.banner_file_id = banner_file_id
        await db.commit()
        
        return {
            "success": True, 
            "message": "Баннер привязан", 
            "poll_id": poll_id,
            "banner_file_id": banner_file_id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        print(f"❌ Ошибка привязки баннера: {e}")
        raise HTTPException(500, detail=f"Ошибка: {str(e)}")