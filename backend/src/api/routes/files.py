from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from src.database.connection import get_db
from src.services.file_service import FileService
from src.api.dependencies import CurrentUser, CurrentAdmin, DatabaseDep
from src.models.file import FileMetadata
from src.schemas.file import FileUploadResponse, FileMetadata

router = APIRouter(prefix="/files", tags=["Files"])

@router.post("/upload", response_model=FileUploadResponse)
async def upload_file(
    db: DatabaseDep,
    current_user: CurrentUser,
    file: UploadFile = File(...),
    entity_type: str = Form(...),
    entity_id: int = Form(...),
    category: str = Form("attachment"),
):
    """
    Загрузка файла и привязка к сущности
    """
    if entity_type == "poll" and current_user["role"] != "admin":
        pass
    
    file_service = FileService()
    upload_result = await file_service.upload_file(
        file=file,
        entity_type=entity_type,
        entity_id=entity_id,
        file_category=category
    )
    
    file_meta = FileMetadata(
        entity_type=entity_type,
        entity_id=entity_id,
        category=category,
        file_key=upload_result["file_id"],
        original_filename=upload_result["filename"],
        content_type=upload_result["content_type"],
        size_bytes=upload_result["size"],
        uploaded_by=current_user["student_id"]
    )
    db.add(file_meta)
    await db.commit()
    await db.refresh(file_meta)
    
    return FileUploadResponse(
        file_id=file_meta.id,
        url=upload_result["url"],
        filename=file_meta.original_filename,
        size=file_meta.size_bytes,
        uploaded_at=file_meta.uploaded_at
    )

@router.get("/{file_id}", response_model=FileMetadata)
async def get_file_info(
    file_id: int,
    db: DatabaseDep,
    current_user: CurrentUser
):
    """Получение информации о файле (без URL)"""
    file_meta = await db.get(FileMetadata, file_id)
    if not file_meta:
        raise HTTPException(status_code=404, detail="Файл не найден")
    
    
    return FileMetadata.model_validate(file_meta)

@router.get("/{file_id}/download")
async def download_file(
    file_id: int,
    db: DatabaseDep,
    current_user: CurrentUser
):
    """
    Получение pre-signed URL для скачивания файла
    """
    file_meta = await db.get(FileMetadata, file_id)
    if not file_meta:
        raise HTTPException(status_code=404, detail="Файл не найден")
    
    
    file_service = FileService()
    url = file_service.get_file_url(file_meta.file_key, expires_in=300)
    
    from fastapi.responses import RedirectResponse
    return RedirectResponse(url=url)

@router.delete("/{file_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_file(
    file_id: int,
    db: DatabaseDep,
    current_user: CurrentUser
):
    """Удаление файла (только загрузивший или админ)"""
    file_meta = await db.get(FileMetadata, file_id)
    if not file_meta:
        raise HTTPException(status_code=404, detail="Файл не найден")
    
    if file_meta.uploaded_by != current_user["student_id"] and current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Недостаточно прав для удаления")
    
    file_service = FileService()
    await file_service.delete_file(file_meta.file_key)
    
    await db.delete(file_meta)
    await db.commit()
    
    return None