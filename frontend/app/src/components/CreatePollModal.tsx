// frontend/src/components/CreatePollModal.tsx

import { useState, ChangeEvent, FormEvent } from 'react';
import './CreatePollModal.css';
import { AuthService, USER_ROLES } from '../services/AuthService';

interface CreatePollModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (pollData: {
    title: string;
    description: string;
    end_date: string;
    options: Array<{ text: string }>;
  }) => Promise<{ id?: number; title?: string } | void> | void;
  onPollCreated?: (pollId: number, pollTitle: string) => void;  // 🔹 Колбэк для загрузки баннера после создания
}

interface FormData {
  title: string;
  description: string;
  end_date: string;
  options: string[];
}

const CreatePollModal = ({ 
  isOpen, 
  onClose, 
  onCreate,
  onPollCreated  // 🔹 Новый пропс
}: CreatePollModalProps) => {
  const [formData, setFormData] = useState<FormData>({
    title: '',
    description: '',
    end_date: '',
    options: ['', '']
  });
  const [submitting, setSubmitting] = useState(false);

  // 🔹 Отправка формы: создаём опрос БЕЗ баннера
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      // 🔹 Проверка прав администратора
      if (!AuthService.hasRole(USER_ROLES.ADMIN)) {
        alert('Недостаточно прав для создания опроса');
        return;
      }
      
      // 🔹 Валидация обязательных полей
      if (!formData.title.trim() || !formData.description.trim() || !formData.end_date) {
        alert('Заполните все обязательные поля');
        return;
      }

      // 🔹 Валидация длины названия
      if (formData.title.trim().length < 5) {
        alert('Название должно содержать минимум 5 символов');
        return;
      }

      // 🔹 Валидация длины описания
      if (formData.description.trim().length < 10) {
        alert('Описание должно содержать минимум 10 символов');
        return;
      }

      // 🔹 Валидация даты
      const endDate = new Date(formData.end_date);
      if (endDate <= new Date()) {
        alert('Дата окончания должна быть в будущем');
        return;
      }

      // 🔹 Валидация вариантов ответов
      const validOptions = formData.options.filter(opt => opt.trim() !== '');
      if (validOptions.length < 2) {
        alert('Добавьте как минимум 2 варианта ответа');
        return;
      }

      // 🔹 Проверка на уникальность вариантов
      const uniqueOptions = new Set(validOptions.map(opt => opt.toLowerCase().trim()));
      if (uniqueOptions.size !== validOptions.length) {
        alert('Варианты ответов должны быть уникальными');
        return;
      }

      // 🔹 Создание опроса
      const result = await onCreate({
        ...formData,
        options: validOptions.map(opt => ({ text: opt.trim() }))
      });
      
      // 🔹 Если опрос создан успешно и есть колбэк — уведомляем родителя
      if (result && typeof result === 'object' && 'id' in result && result.id) {
        console.log('Poll created with ID:', result.id);
        
        // 🔹 Закрываем модалку создания
        onClose();
        
        // 🔹 Сбрасываем форму
        setFormData({
          title: '',
          description: '',
          end_date: '',
          options: ['', '']
        });
        
        // 🔹 Вызываем колбэк для загрузки баннера (если передан)
        if (onPollCreated) {
          onPollCreated(result.id, result.title || formData.title);
        }
      } else {
        // Если onCreate не вернул ID — просто закрываем
        onClose();
        setFormData({
          title: '',
          description: '',
          end_date: '',
          options: ['', '']
        });
      }
      
    } catch (error) {
      console.error('Error creating poll:', error);
      alert(error instanceof Error ? error.message : 'Не удалось создать опрос');
    } finally {
      setSubmitting(false);
    }
  };

  // 🔹 Добавление варианта ответа
  const addOption = () => {
    setFormData(prev => ({
      ...prev,
      options: [...prev.options, '']
    }));
  };

  // 🔹 Удаление варианта ответа
  const removeOption = (index: number) => {
    if (formData.options.length > 2) {
      setFormData(prev => ({
        ...prev,
        options: prev.options.filter((_, i) => i !== index)
      }));
    }
  };

  // 🔹 Обновление текста варианта ответа
  const updateOption = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      options: prev.options.map((opt, i) => i === index ? value : opt)
    }));
  };

  // 🔹 Если модалка закрыта — не рендерим
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-content">
        <div className="modal-header">
          <h2>Создать новый опрос</h2>
          <button type="button" className="close-btn" onClick={onClose} disabled={submitting}>
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="poll-title">Название опроса *</label>
            <input
              id="poll-title"
              type="text"
              value={formData.title}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Введите название опроса"
              required
              disabled={submitting}
              minLength={5}
              maxLength={200}
            />
          </div>

          <div className="form-group">
            <label htmlFor="poll-description">Описание *</label>
            <textarea
              id="poll-description"
              value={formData.description}
              onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Опишите опрос"
              rows={3}
              required
              disabled={submitting}
              minLength={10}
              maxLength={1000}
            />
          </div>

          <div className="form-group">
            <label htmlFor="poll-end-date">Дата окончания *</label>
            <input
              id="poll-end-date"
              type="datetime-local"
              value={formData.end_date}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
              required
              disabled={submitting}
            />
          </div>

          <div className="form-group">
            <label>Варианты ответов *</label>
            {formData.options.map((option, index) => (
              <div key={index} className="option-input-group">
                <input
                  type="text"
                  value={option}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => updateOption(index, e.target.value)}
                  placeholder={`Вариант ${index + 1}`}
                  required
                  disabled={submitting}
                />
                {formData.options.length > 2 && (
                  <button
                    type="button"
                    className="remove-option-btn"
                    onClick={() => removeOption(index)}
                    disabled={submitting}
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
            <button 
              type="button" 
              className="add-option-btn" 
              onClick={addOption} 
              disabled={submitting}
            >
              + Добавить вариант
            </button>
          </div>

          {/* 🔹 Информационное сообщение о баннере */}
          <div className="form-group" style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #eee' }}>
            <label>Баннер опроса</label>
            <div className="banner-hint">
              <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
                💡 Баннер можно добавить после создания опроса на странице редактирования.
              </p>
            </div>
          </div>

          <div className="modal-actions">
            <button 
              type="button" 
              className="cancel-btn" 
              onClick={onClose} 
              disabled={submitting}
            >
              Отмена
            </button>
            <button 
              type="submit" 
              className="create-btn" 
              disabled={submitting}
            >
              {submitting ? 'Создание...' : 'Создать опрос'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreatePollModal;