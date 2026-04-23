import os
from pathlib import Path
from typing import List, Optional
from dotenv import load_dotenv
from pydantic_settings import BaseSettings, SettingsConfigDict


def find_env_path() -> str:
    
    backend_env = Path('backend') / '.env'
    if backend_env.exists():
        return str(backend_env)
    
    
    return '.env'


load_dotenv(dotenv_path=find_env_path())


class Settings(BaseSettings):
   

    APP_NAME: str = "Система студенческих опросов"
    APP_VERSION: str = "1.0.0"
    APP_DEBUG: bool = False
    
    API_PREFIX: str = "/api"
    
    
    DB_HOST: str = "localhost"
    DB_PORT: int = 5432
    DB_USER: str = "postgres"
    DB_PASS: str = "postgres"
    DB_NAME: str = "poll_system"
    
    @property
    def DATABASE_URL_asyncpg(self) -> str:
        return (
            f"postgresql+asyncpg://{self.DB_USER}:{self.DB_PASS}"
            f"@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"
        )
    
    @property
    def DATABASE_URL_psycopg2(self) -> str:
        return (
            f"postgresql://{self.DB_USER}:{self.DB_PASS}"
            f"@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"
        )
    
    DB_POOL_SIZE: int = 10
    DB_MAX_OVERFLOW: int = 20
    DB_POOL_TIMEOUT: int = 30
    DB_POOL_RECYCLE: int = 3600
    
    
    SECRET_KEY: str = "your-secret-key-here-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    ADMIN_STUDENT_IDS: List[str] = ["777"]

    
    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
    ]
    
    CORS_ALLOW_CREDENTIALS: bool = True
    
    
    S3_ENDPOINT_URL: Optional[str] = "http://localhost:9000"
    S3_ACCESS_KEY: str = "minioadmin"
    S3_SECRET_KEY: str = "minioadmin"
    S3_BUCKET_NAME: str = "poll-system-files"
    S3_REGION: str = "us-east-1"
    
    LOCAL_STORAGE_PATH: str = "backend/uploads"
    USE_LOCAL_STORAGE: bool = False
    
    S3_URL_EXPIRY_SECONDS: int = 3600
    S3_PUBLIC_BUCKET: bool = False
    
    MAX_FILE_SIZE_MB: int = 10
    MAX_FILE_SIZE_BYTES: int = 10 * 1024 * 1024  
    
    ALLOWED_FILE_TYPES: List[str] = [
        "image/jpeg",
        "image/png", 
        "image/gif",
        "image/webp",
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ]
    
    ALLOWED_FILE_EXTENSIONS: List[str] = [
        ".jpg", ".jpeg", ".png", ".gif", ".webp",
        ".pdf", ".doc", ".docx"
    ]
    
    FILE_CATEGORY_LIMITS: dict = {
        "banner": {
            "max_size_mb": 5,
            "allowed_types": ["image/jpeg", "image/png", "image/webp"],
            "min_dimensions": {"width": 800, "height": 400},
        },
        "avatar": {
            "max_size_mb": 2,
            "allowed_types": ["image/jpeg", "image/png", "image/webp"],
            "min_dimensions": {"width": 200, "height": 200},
        },
        "attachment": {
            "max_size_mb": 10,
            "allowed_types": ALLOWED_FILE_TYPES,
        },
        "document": {
            "max_size_mb": 20,
            "allowed_types": ["application/pdf", "application/msword", 
                             "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
        },
    }
    
    
    LOG_LEVEL: str = "INFO"
    LOG_FILE: Optional[str] = "backend/logs/app.log"
    LOG_FORMAT: str = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    
    
    @property
    def is_debug(self) -> bool:
        """Удобный доступ к debug режиму"""
        return self.APP_DEBUG or os.getenv("DEBUG", "false").lower() == "true"
    
    @property
    def s3_configured(self) -> bool:
        """Проверка, настроено ли S3 хранилище"""
        return bool(self.S3_ENDPOINT_URL and self.S3_ACCESS_KEY and self.S3_SECRET_KEY)
    
    def get_file_limits(self, category: str) -> dict:
        """Получить ограничения для категории файла"""
        return self.FILE_CATEGORY_LIMITS.get(category, {
            "max_size_mb": self.MAX_FILE_SIZE_MB,
            "allowed_types": self.ALLOWED_FILE_TYPES,
        })
    
    def is_file_type_allowed(self, content_type: str, category: Optional[str] = None) -> bool:
        """Проверить, разрешён ли тип файла"""
        if category and category in self.FILE_CATEGORY_LIMITS:
            allowed = self.FILE_CATEGORY_LIMITS[category].get("allowed_types", self.ALLOWED_FILE_TYPES)
        else:
            allowed = self.ALLOWED_FILE_TYPES
        return content_type in allowed
    
    def get_max_file_size(self, category: Optional[str] = None) -> int:
        """Получить максимальный размер файла в байтах"""
        if category and category in self.FILE_CATEGORY_LIMITS:
            mb = self.FILE_CATEGORY_LIMITS[category].get("max_size_mb", self.MAX_FILE_SIZE_MB)
        else:
            mb = self.MAX_FILE_SIZE_MB
        return mb * 1024 * 1024
    
    
    model_config = SettingsConfigDict(
        env_file=find_env_path(),
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )


settings = Settings()

