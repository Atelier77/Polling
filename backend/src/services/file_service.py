# backend/src/services/file_service.py
import boto3
from botocore.exceptions import ClientError
from datetime import timedelta
from fastapi import HTTPException, UploadFile
from src.config import settings
import mimetypes
import os

class FileService:
    def __init__(self):
        self.s3_client = boto3.client(
            's3',
            endpoint_url=settings.S3_ENDPOINT_URL,
            aws_access_key_id=settings.S3_ACCESS_KEY,
            aws_access_key_secret=settings.S3_SECRET_KEY,
            region_name=settings.S3_REGION,
        )
        self.bucket = settings.S3_BUCKET_NAME
    
    async def upload_file(
        self, 
        file: UploadFile, 
        entity_type: str,
        entity_id: int,
        file_category: str = "attachment"
    ) -> dict:
        """
        Загрузка файла в S3
        Возвращает: {file_id, url, filename, size, content_type}
        """
        content_type = file.content_type or mimetypes.guess_type(file.filename)[0]
        if content_type not in settings.ALLOWED_FILE_TYPES:
            raise HTTPException(
                status_code=400,
                detail=f"Недопустимый тип файла: {content_type}"
            )
        
        content = await file.read()
        if len(content) > settings.MAX_FILE_SIZE_MB * 1024 * 1024:
            raise HTTPException(
                status_code=400,
                detail=f"Файл слишком большой (макс. {settings.MAX_FILE_SIZE_MB}MB)"
            )
        
        ext = os.path.splitext(file.filename)[1] or ".bin"
        file_key = f"{entity_type}/{entity_id}/{file_category}/{entity_id}_{file_category}{ext}"
        
        try:
            self.s3_client.put_object(
                Bucket=self.bucket,
                Key=file_key,
                Body=content,
                ContentType=content_type,
                Metadata={
                    "entity_type": entity_type,
                    "entity_id": str(entity_id),
                    "category": file_category,
                    "original_filename": file.filename
                }
            )
            
            url = self.s3_client.generate_presigned_url(
                'get_object',
                Params={'Bucket': self.bucket, 'Key': file_key},
                ExpiresIn=3600  # 1 час
            )
            
            return {
                "file_id": file_key,
                "url": url,
                "filename": file.filename,
                "size": len(content),
                "content_type": content_type,
                "uploaded_at": datetime.utcnow().isoformat()
            }
            
        except ClientError as e:
            raise HTTPException(
                status_code=500,
                detail=f"Ошибка загрузки файла: {str(e)}"
            )
    
    def get_file_url(self, file_key: str, expires_in: int = 3600) -> str:
        """Получение pre-signed URL для скачивания"""
        try:
            return self.s3_client.generate_presigned_url(
                'get_object',
                Params={'Bucket': self.bucket, 'Key': file_key},
                ExpiresIn=expires_in
            )
        except ClientError as e:
            raise HTTPException(status_code=500, detail=f"Ошибка получения URL: {str(e)}")
    
    async def delete_file(self, file_key: str) -> bool:
        """Удаление файла из S3"""
        try:
            self.s3_client.delete_object(Bucket=self.bucket, Key=file_key)
            return True
        except ClientError:
            return False