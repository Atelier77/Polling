import { useState } from 'react';
import { FileUpload} from './FileUpload';
import { DataService } from '../services/DataService';
import { FileInfo } from '../types/file';
import './PollBannerUpload.css';

interface PollBannerUploadProps {
  pollId: number;
  pollTitle: string;
  currentBannerUrl?: string | null;
  onBannerUploaded: () => void;
  onBack: () => void;
}

export const PollBannerUpload = ({
  pollId,
  pollTitle,
  currentBannerUrl,
  onBannerUploaded,
  onBack
}: PollBannerUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleUploadSuccess = async (fileInfo: FileInfo) => {
    setUploading(true);
    setError(null);
    
    try {
      await DataService.request(`/api/polls/${pollId}/banner`, {
        method: 'PUT',
        body: JSON.stringify({ 
          banner_file_id: fileInfo.file_id 
        })
      });
      
      setSuccess(true);
      onBannerUploaded();
      
    } catch (err: any) {
      console.error('Failed to attach banner:', err);
      setError(err.message || 'Не удалось привязать баннер к опросу');
    } finally {
      setUploading(false);
    }
  };

  const handleUploadError = (errorMsg: string) => {
    setError(errorMsg);
  };

  const handleRemoveBanner = async () => {
    if (!window.confirm('Удалить баннер у этого опроса?')) {
      return;
    }
    
    try {
      await DataService.request(`/api/polls/${pollId}/banner`, {
        method: 'DELETE'
      });
      onBannerUploaded();
    } catch (err: any) {
      setError(err.message || 'Не удалось удалить баннер');
    }
  };

  return (
    <div className="poll-banner-upload">
      <div className="banner-upload-header">
        <button type="button" className="back-btn" onClick={onBack}>
          ← Назад
        </button>
        <h3>Баннер для опроса: {pollTitle}</h3>
      </div>
      
      {currentBannerUrl && (
        <div className="current-banner">
          <p>Текущий баннер:</p>
          <img 
            src={currentBannerUrl} 
            alt="Current banner" 
            className="banner-preview"
            onError={(e) => (e.currentTarget.style.display = 'none')}
          />
          <button 
            type="button" 
            className="remove-banner-btn"
            onClick={handleRemoveBanner}
            disabled={uploading}
          >
            Удалить баннер
          </button>
        </div>
      )}
      
      <div className="upload-section">
        <p>{currentBannerUrl ? 'Заменить баннер:' : 'Загрузить баннер:'}</p>
        
        <FileUpload
          entityType="poll"
          entityId={pollId}
          category="banner"
          accept="image/*"
          maxSizeMB={5}
          label={currentBannerUrl ? 'Выбрать новый баннер' : 'Выберите изображение'}
          disabled={uploading}
          onUploadSuccess={handleUploadSuccess}
          onUploadError={handleUploadError}
        />
        
        {uploading && (
          <div className="uploading-status">
            <span className="spinner" /> Загрузка и привязка...
          </div>
        )}
        
        {success && !uploading && (
          <div className="success-message">
            Баннер успешно добавлен!
          </div>
        )}
        
        {error && (
          <div className="error-message" role="alert">
            {error}
          </div>
        )}
      </div>
      
      <div className="upload-hint">
        <p>
          <strong>Рекомендации:</strong><br/>
          • Формат: JPG, PNG, GIF, WebP<br/>
          • Размер: до 5 MB<br/>
          • Рекомендуемое разрешение: 1200×400 px
        </p>
      </div>
    </div>
  );
};