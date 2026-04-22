// frontend/src/types/fileConfig.ts

/**
 * Публичные настройки файлового хранилища
 * Эти данные безопасны для передачи на клиент
 */
export interface FileStorageConfig {
  /** Максимальный размер файла в мегабайтах */
  maxFileSizeMb: number;
  
  /** Разрешённые MIME-типы файлов */
  allowedTypes: string[];
  
  /** Разрешённые расширения файлов */
  allowedExtensions: string[];
  
  /** Является ли бакет публичным (файлы доступны по прямой ссылке) */
  isPublicBucket: boolean;
  
  /** Время жизни pre-signed URL в секундах (только для приватных бакетов) */
  urlExpirySeconds: number | null;
  
  /** Доступные категории файлов */
  categories: string[];
}

/**
 * Значения по умолчанию (резерв, если не удалось получить с сервера)
 */
export const DEFAULT_FILE_CONFIG: FileStorageConfig = {
  maxFileSizeMb: 10,
  allowedTypes: [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ],
  allowedExtensions: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.pdf', '.doc', '.docx'],
  isPublicBucket: false,
  urlExpirySeconds: 3600, // 1 час по умолчанию
  categories: ['banner', 'avatar', 'attachment', 'document']
};