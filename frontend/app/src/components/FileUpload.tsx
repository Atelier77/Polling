import { useState, useRef, useEffect, ChangeEvent } from 'react';
import { DataService } from '../services/DataService';
import { FileStorageConfig, DEFAULT_FILE_CONFIG } from '../types/fileConfig';
import { FileInfo } from '../types/file';
import './FileUpload.css';

interface FileUploadProps {

    entityType: 'poll' | 'user' | 'option';
  entityId: number;
  category: 'banner' | 'avatar' | 'attachment' | 'document';
  
  onUploadSuccess?: (fileInfo: FileInfo) => void;
  onUploadError?: (error: string) => void;
  onUploadProgress?: (progress: number) => void;
  
  accept?: string;
  maxSizeMB?: number;
  label?: string;
  disabled?: boolean;
  
  storageConfig?: FileStorageConfig;
  
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
  
  const [config, setConfig] = useState<FileStorageConfig | null>(storageConfig || null);
  const [configLoading, setConfigLoading] = useState(autoFetchConfig && !storageConfig);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const effectiveMaxSizeMB = maxSizeMB ?? config?.maxFileSizeMb ?? DEFAULT_FILE_CONFIG.maxFileSizeMb;
  const effectiveAccept = accept ?? (config?.allowedTypes.length 
    ? config.allowedTypes.map(t => t.replace('/', '/*')).join(',') 
    : 'image/*');
  const isPublicBucket = config?.isPublicBucket ?? DEFAULT_FILE_CONFIG.isPublicBucket;
  const urlExpirySeconds = config?.urlExpirySeconds ?? DEFAULT_FILE_CONFIG.urlExpirySeconds;

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

  const handleFileSelect = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const fileSizeMB = file.size / (1024 * 1024);
    if (fileSizeMB > effectiveMaxSizeMB) {
      const errorMsg = `Файл слишком большой (${fileSizeMB.toFixed(1)}MB). Максимум: ${effectiveMaxSizeMB}MB`;
      setError(errorMsg);
      onUploadError?.(errorMsg);
      return;
    }

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

  const handleRemoveFile = () => {
    setPreviewUrl(null);
    setError(null);
    setProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClick = () => {
    if (!disabled && !uploading && !configLoading) {
      fileInputRef.current?.click();
    }
  };

  return (
    <div className="file-upload">
      <input
        ref={fileInputRef}
        type="file"
        accept={effectiveAccept}
        onChange={handleFileSelect}
        disabled={disabled || uploading || configLoading}
        className="file-input"
        aria-label={label}
      />
      
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
      
      {uploading && progress > 0 && progress < 100 && (
        <div className="upload-progress" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>
          <span className="progress-text">{progress}%</span>
        </div>
      )}
      
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
      
      {error && (
        <div className="upload-error" role="alert">
          {error}
        </div>
      )}
      
      <div className="upload-hint">
        Макс. размер: {effectiveMaxSizeMB}MB • Типы: {effectiveAccept.replace('/*', '').replace(/,/g, ', ')}
      </div>
      
      {!isPublicBucket && urlExpirySeconds && (
        <div className="url-expiry-hint" title="Ссылка обновляется автоматически при необходимости">
          Ссылка временная ({Math.round(urlExpirySeconds / 60)} мин)
        </div>
      )}
    </div>
  );
};