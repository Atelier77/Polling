import React, { useState, useRef } from 'react';
import { DataService } from '../services/DataService';
import './FileUpload.css';

interface FileUploadProps {
  entityType: 'poll' | 'user';
  entityId: number;
  category: 'banner' | 'avatar' | 'attachment';
  onUploadSuccess?: (fileInfo: FileInfo) => void;
  accept?: string;
  maxSizeMB?: number;
}

export interface FileInfo {
  file_id: number;
  url: string;
  filename: string;
  size: number;
  content_type: string;
  uploaded_at: string;
}

export const FileUpload: React.FC<FileUploadProps> = ({
  entityType,
  entityId,
  category,
  onUploadSuccess,
  accept = 'image/*',
  maxSizeMB = 10,
}) => {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // 🔹 Валидация на клиенте
    if (file.size > maxSizeMB * 1024 * 1024) {
      setError(`Файл слишком большой (макс. ${maxSizeMB}MB)`);
      return;
    }

    if (accept && !file.type.match(accept.replace('/*', '/'))) {
      setError(`Недопустимый тип файла: ${file.type}`);
      return;
    }

    setUploading(true);
    setError(null);
    setProgress(0);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('entity_type', entityType);
      formData.append('entity_id', entityId.toString());
      formData.append('category', category);

      // 🔹 Отправка с отслеживанием прогресса
      const result = await DataService.uploadFile(formData, (progressEvent) => {
        if (progressEvent.total) {
          setProgress(Math.round((progressEvent.loaded * 100) / progressEvent.total));
        }
      });

      if (result.success && result.file) {
        onUploadSuccess?.(result.file);
      } else {
        setError(result.error || 'Ошибка загрузки');
      }
    } catch (err: any) {
      setError(err.message || 'Ошибка сети');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="file-upload">
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileSelect}
        disabled={uploading}
        className="file-input"
      />
      
      {uploading && (
        <div className="upload-progress">
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>
          <span>{progress}%</span>
        </div>
      )}
      
      {error && <div className="upload-error">{error}</div>}
      
      <div className="upload-hint">
        Макс. размер: {maxSizeMB}MB • Типы: {accept}
      </div>
    </div>
  );
};