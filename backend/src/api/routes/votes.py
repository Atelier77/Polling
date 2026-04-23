from fastapi import APIRouter, HTTPException, status, Depends
from sqlalchemy import select

from src.models.vote import Vote, VoteCreate
from src.models.poll import Poll, Option
from src.queries.votes import has_user_voted
from src.api.dependencies import DatabaseDep, CurrentUser

router = APIRouter()


@router.post("/", status_code=status.HTTP_201_CREATED)
async def vote(
    vote_data: VoteCreate,  # ← Pydantic модель, доступ через .poll_id
    db: DatabaseDep,
    current_user: CurrentUser  # ← Переименовали для ясности
):
    """
    Проголосовать в опросе
    """
    try:
        # 🔹 Получаем данные из Pydantic модели (через точку, не .get()!)
        poll_id = vote_data.poll_id
        option_id = vote_data.option_id
        student_id = current_user.get("student_id")
        
        # 🔹 Проверяем, не голосовал ли уже пользователь
        if await has_user_voted(db, poll_id, student_id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, 
                detail="Вы уже голосовали в этом опросе"
            )
        
        # 🔹 Получаем опцию из БД (чтобы увеличить счётчик)
        option_result = await db.execute(
            select(Option).where(Option.id == option_id)
        )
        option = option_result.scalar_one_or_none()
        
        if not option:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Вариант ответа не найден"
            )
        
        # 🔹 Получаем опрос из БД (чтобы увеличить общий счётчик)
        poll_result = await db.execute(
            select(Poll).where(Poll.id == poll_id)
        )
        poll = poll_result.scalar_one_or_none()
        
        if not poll:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Опрос не найден"
            )
        
        # 🔹 Проверяем, что опция принадлежит этому опросу
        if option.poll_id != poll_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Вариант ответа не принадлежит этому опросу"
            )
        
        # 🔹 Создаём голос
        new_vote = Vote(
            poll_id=poll_id,
            option_id=option_id,
            student_id=student_id
        )
        db.add(new_vote)  # Добавляем в сессию
        
        # 🔹 Увеличиваем счётчики
        option.votes += 1
        poll.total_votes += 1
        
        # 🔹 Сохраняем все изменения в БД
        await db.commit()
        
        # 🔹 Обновляем объект голоса (получаем ID)
        await db.refresh(new_vote)
        
        print(f"✅ Vote created: user={student_id}, poll={poll_id}, option={option_id}")
        
        return {
            "success": True, 
            "message": "Голос успешно принят", 
            "vote_id": new_vote.id
        }
        
    except HTTPException:
        # 🔹 Пропускаем уже обработанные ошибки
        raise
    except Exception as e:
        # 🔹 Откат при непредвиденной ошибке
        await db.rollback()
        print(f"❌ Error creating vote: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail=f"Ошибка при голосовании: {str(e)}"
        )


@router.get("/check/{poll_id}")
async def check_vote(
    poll_id: int,
    db: DatabaseDep,
    current_user: CurrentUser
):
    """
    Проверить, голосовал ли пользователь в указанном опросе
    """
    try:
        student_id = current_user.get("student_id")
        voted = await has_user_voted(db, poll_id, student_id)
        return {
            "has_voted": voted, 
            "poll_id": poll_id,
            "student_id": student_id
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ошибка при проверке голоса: {str(e)}"
        )


@router.get("/user-votes")
async def get_user_votes(
    db: DatabaseDep,
    current_user: CurrentUser
):
    """
    Получить все голоса текущего пользователя
    """
    from src.queries.votes import get_user_votes as get_user_votes_query
    
    try:
        student_id = current_user.get("student_id")
        votes = await get_user_votes_query(db, student_id)
        return {
            "student_id": student_id,
            "votes": votes
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ошибка при получении голосов: {str(e)}"
        )