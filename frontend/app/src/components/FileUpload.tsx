// frontend/src/components/FileUpload.tsx

import { useState, useRef, useEffect, ChangeEvent } from 'react';
import { DataService } from '../services/DataService';
import { FileStorageConfig, DEFAULT_FILE_CONFIG } from '../types/fileConfig';
import { FileInfo } from '../types/file';
import './FileUpload.css';

interface FileUploadProps {
  // 🔹 Обязательные пропсы
  entityType: 'poll' | 'user' | 'option';
  entityId: number;
  category: 'banner' | 'avatar' | 'attachment' | 'document';
  
  // 🔹 Колбэки
  onUploadSuccess?: (fileInfo: FileInfo) => void;
  onUploadError?: (error: string) => void;
  onUploadProgress?: (progress: number) => void;
  
  // 🔹 Настройки внешнего вида
  accept?: string;
  maxSizeMB?: number;
  label?: string;
  disabled?: boolean;
  
  // 🔹 Настройки хранилища (передаются от родителя)
  storageConfig?: FileStorageConfig;
  
  // 🔹 Флаг: загружать конфиг автоматически, если не передан
  autoFetchConfig?: boolean;
}

export const FileUpload = ({
  entityType,
  entityId,
  category,
  onUploadSuccess,
  onUploadError,
  onUploadProgress,
  accept,
  maxSizeMB,
  label = 'Выберите файл',
  disabled = false,
  storageConfig,
  autoFetchConfig = true,
}: FileUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  
  // 🔹 Состояние для конфигурации
  const [config, setConfig] = useState<FileStorageConfig | null>(storageConfig || null);
  const [configLoading, setConfigLoading] = useState(autoFetchConfig && !storageConfig);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 🔹 Загрузка конфигурации при монтировании
  useEffect(() => {
    if (autoFetchConfig && !storageConfig) {
      let isMounted = true;
      
      const loadConfig = async () => {
        try {
          setConfigLoading(true);
          const fetchedConfig = await DataService.getFileStorageConfigWithFallback();
          
          if (isMounted) {
            setConfig(fetchedConfig);
          }
        } catch (err) {
          console.warn('Failed to load file config:', err);
          if (isMounted) {
            setConfig(DEFAULT_FILE_CONFIG);
          }
        } finally {
          if (isMounted) {
            setConfigLoading(false);
          }
        }
      };
      
      loadConfig();
      
      return () => {
        isMounted = false;
      };
    }
  }, [autoFetchConfig, storageConfig]);

  // 🔹 Вычисляем эффективные значения настроек
  const effectiveMaxSizeMB = maxSizeMB ?? config?.maxFileSizeMb ?? DEFAULT_FILE_CONFIG.maxFileSizeMb;
  const effectiveAccept = accept ?? (config?.allowedTypes.length 
    ? config.allowedTypes.map(t => t.replace('/', '/*')).join(',') 
    : 'image/*');
  const isPublicBucket = config?.isPublicBucket ?? DEFAULT_FILE_CONFIG.isPublicBucket;
  const urlExpirySeconds = config?.urlExpirySeconds ?? DEFAULT_FILE_CONFIG.urlExpirySeconds;

  // 🔹 Генерация превью для изображений
  const generatePreview = (file: File) => {
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewUrl(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setPreviewUrl(null);
    }
  };

  // 🔹 Обработчик выбора файла
  const handleFileSelect = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // 🔹 Валидация размера
    const fileSizeMB = file.size / (1024 * 1024);
    if (fileSizeMB > effectiveMaxSizeMB) {
      const errorMsg = `Файл слишком большой (${fileSizeMB.toFixed(1)}MB). Максимум: ${effectiveMaxSizeMB}MB`;
      setError(errorMsg);
      onUploadError?.(errorMsg);
      return;
    }

    // 🔹 Валидация типа
    if (effectiveAccept && !file.type.match(effectiveAccept.replace('/*', '/'))) {
      const errorMsg = `Недопустимый тип файла: ${file.type}`;
      setError(errorMsg);
      onUploadError?.(errorMsg);
      return;
    }

    setUploading(true);
    setError(null);
    setProgress(0);
    generatePreview(file);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('entity_type', entityType);
      formData.append('entity_id', entityId.toString());
      formData.append('category', category);

      const result = await DataService.uploadFile(formData, (progressEvent) => {
        if (progressEvent.total) {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setProgress(percent);
          onUploadProgress?.(percent);
        }
      });

      if (result.success && result.file) {
        onUploadSuccess?.(result.file);
        setError(null);
      } else {
        const errorMsg = result.error || 'Ошибка загрузки файла';
        setError(errorMsg);
        onUploadError?.(errorMsg);
        setPreviewUrl(null);
      }
    } catch (err: any) {
      const errorMsg = err.message || 'Ошибка сети при загрузке';
      setError(errorMsg);
      onUploadError?.(errorMsg);
      setPreviewUrl(null);
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // 🔹 Удаление файла
  const handleRemoveFile = () => {
    setPreviewUrl(null);
    setError(null);
    setProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // 🔹 Клик по кнопке
  const handleClick = () => {
    if (!disabled && !uploading && !configLoading) {
      fileInputRef.current?.click();
    }
  };

  return (
    <div className="file-upload">
      {/* 🔹 Скрытый input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={effectiveAccept}
        onChange={handleFileSelect}
        disabled={disabled || uploading || configLoading}
        className="file-input"
        aria-label={label}
      />
      
      {/* 🔹 Видимая кнопка */}
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled || uploading || configLoading}
        className="file-upload-button"
      >
        {configLoading ? (
          <span className="loading-text">
            <span className="spinner" /> Загрузка настроек...
          </span>
        ) : uploading ? (
          <span className="uploading-text">
            <span className="spinner" /> Загрузка {progress}%...
          </span>
        ) : (
          label
        )}
      </button>
      
      {/* 🔹 Прогресс-бар */}
      {uploading && progress > 0 && progress < 100 && (
        <div className="upload-progress" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>
          <span className="progress-text">{progress}%</span>
        </div>
      )}
      
      {/* 🔹 Предпросмотр для изображений */}
      {previewUrl && !uploading && (
        <div className="file-preview">
          <img 
            src={previewUrl} 
            alt="Preview" 
            className="preview-image"
            onError={() => setPreviewUrl(null)}
          />
          <button
            type="button"
            onClick={handleRemoveFile}
            className="remove-file-btn"
            aria-label="Удалить файл"
            disabled={disabled}
          >
            ×
          </button>
        </div>
      )}
      
      {/* 🔹 Сообщение об ошибке */}
      {error && (
        <div className="upload-error" role="alert">
          {error}
        </div>
      )}
      
      {/* 🔹 Подсказка с настройками */}
      <div className="upload-hint">
        Макс. размер: {effectiveMaxSizeMB}MB • Типы: {effectiveAccept.replace('/*', '').replace(/,/g, ', ')}
      </div>
      
      {/* 🔹 Предупреждение о pre-signed URL (только если бакет приватный) */}
      {!isPublicBucket && urlExpirySeconds && (
        <div className="url-expiry-hint" title="Ссылка обновляется автоматически при необходимости">
          ⚠️ Ссылка временная ({Math.round(urlExpirySeconds / 60)} мин)
        </div>
      )}
    </div>
  );
};