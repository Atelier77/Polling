// C:\К_3\FS\frontend\app\src\components\Dashboard.tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DataService } from '../services/DataService';
import { AuthService, USER_ROLES } from '../services/AuthService';
import CreatePollModal from './CreatePollModal';
import { PollFilters, FilterState } from './PollFilters';
import { Pagination } from './Pagination';
import './Dashboard.css';

// 🔹 Типы для опроса
export interface Poll {
  id: number;
  title: string;
  description: string;
  end_date: string;
  total_votes: number;
  created_at: string;
  options?: Array<{
    id: number;
    text: string;
    votes: number;
  }>;
}

// 🔹 Типы для пагинации
interface PaginationData {
  total: number;
  pages: number;
}

interface DashboardProps {
  user: {
    id?: number;
    student_id: string;
    name: string;
    faculty: string;
    role?: string;
  } | null;
  userRole: string | null;
  onLogout: () => void;
}

const Dashboard = ({ user, userRole, onLogout }: DashboardProps) => {
  const navigate = useNavigate();
  const [polls, setPolls] = useState<Poll[]>([]);
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    status: 'all',
    sortBy: 'created_at',
    sortOrder: 'desc',
    page: 1,
    limit: 10,
  });
  const [pagination, setPagination] = useState<PaginationData>({ total: 0, pages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const isAdmin = userRole === USER_ROLES.ADMIN;

  useEffect(() => {
    loadPolls();
  }, [filters]);

  const loadPolls = async () => {
    try {
      setLoading(true);
      setError(null);

      // 🔹 Формируем query параметры
      const params = new URLSearchParams();
      
      if (filters.search) params.append('search', filters.search);
      if (filters.status !== 'all') params.append('status', filters.status);
      params.append('sort_by', filters.sortBy);
      params.append('sort_order', filters.sortOrder);
      params.append('page', filters.page.toString());
      params.append('limit', filters.limit.toString());

      // 🔹 Загружаем опросы с сервера
      const data = await DataService.getPolls(params.toString());
      
      // 🔹 Обрабатываем ответ (может быть массив или объект с пагинацией)
      if (Array.isArray(data)) {
        setPolls(data);
        setPagination({ total: data.length, pages: Math.ceil(data.length / filters.limit) });
      } else if (data && typeof data === 'object' && 'items' in data) {
        setPolls(data.items);
        setPagination({ 
          total: data.total || 0, 
          pages: data.pages || Math.ceil((data.total || 0) / filters.limit)
        });
      } else {
        setPolls([]);
        setPagination({ total: 0, pages: 0 });
      }
    } catch (err) {
      console.error('Error loading polls:', err);
      setError('Не удалось загрузить опросы. Проверьте подключение к серверу.');
    } finally {
      setLoading(false);
    }
  };

  const handlePollClick = (pollId: number) => {
    const hasVoted = DataService.hasVotedLocally(pollId);
    
    if (hasVoted) {
      navigate(`/results/${pollId}`);
    } else {
      navigate(`/poll/${pollId}`);
    }
  };

  const isPollExpired = (endDate: string): boolean => {
    if (!endDate) return false;
    return new Date() > new Date(endDate);
  };

  const formatDate = (dateString: string): string => {
    if (!dateString) return 'Дата не указана';
    try {
      const date = new Date(dateString);
      const now = new Date();
      
      if (date < now) {
        return 'Завершен';
      }
      
      const options: Intl.DateTimeFormatOptions = { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      };
      return `До ${date.toLocaleDateString('ru-RU', options)}`;
    } catch (error) {
      return 'Ошибка даты';
    }
  };

  const handleCreatePoll = async (pollData: {
    title: string;
    description: string;
    end_date: string;
    options: Array<{ text: string }>;
  }) => {
    try {
      const token = localStorage.getItem('access_token');
      
      if (!token) {
        alert('Ошибка авторизации. Войдите заново.');
        return;
      }

      const requestData = {
        title: pollData.title,
        description: pollData.description,
        end_date: pollData.end_date,
        options: pollData.options
      };

      const response = await fetch('http://localhost:8000/api/polls/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(requestData)
      });

      if (response.ok) {
        await loadPolls();
        setShowCreateModal(false);
        alert('Опрос успешно создан!');
      } else {
        const errorData = await response.json().catch(() => ({}));
        alert(errorData.detail || 'Ошибка при создании опроса');
      }
    } catch (err) {
      console.error('Error creating poll:', err);
      alert('Ошибка сети. Проверьте, что сервер запущен.');
    }
  };

  const handleFiltersChange = (newFilters: FilterState) => {
    setFilters(newFilters);
  };

  const handlePageChange = (page: number) => {
    setFilters(prev => ({ ...prev, page }));
  };

  if (loading && polls.length === 0) {
    return (
      <div className="dashboard-container">
        <Header user={user} userRole={userRole} onLogout={onLogout} />
        <div className="loading-state">
          <i className="fas fa-spinner fa-spin"></i>
          <p>Загрузка опросов...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <Header user={user} userRole={userRole} onLogout={onLogout} />
      
      <main className="dashboard-main">
        <div className="dashboard-header">
          <div>
            <h1>Доступные опросы</h1>
            <p>Выберите опрос для участия или просмотра результатов. Все голоса полностью анонимны.</p>
          </div>
          
          {isAdmin && (
            <button 
              className="create-poll-btn"
              onClick={() => setShowCreateModal(true)}
            >
              <i className="fas fa-plus"></i>
              Создать опрос
            </button>
          )}
        </div>

        {/* 🔹 Компонент фильтров */}
        <PollFilters 
          initialFilters={filters}
          onFiltersChange={handleFiltersChange}
        />

        {error && (
          <div className="error-alert">
            <i className="fas fa-exclamation-circle"></i>
            {error}
          </div>
        )}

        {polls.length === 0 && !loading ? (
          <div className="empty-state">
            <i className="fas fa-inbox"></i>
            <h3>Нет доступных опросов</h3>
            <p>В данный момент нет активных опросов для голосования.</p>
            {isAdmin && (
              <button 
                className="create-poll-btn"
                onClick={() => setShowCreateModal(true)}
              >
                <i className="fas fa-plus"></i>
                Создать первый опрос
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="polls-grid">
              {polls.map(poll => {
                const hasVoted = DataService.hasVotedLocally(poll.id);
                const isExpired = isPollExpired(poll.end_date);
                
                return (
                  <div 
                    key={poll.id} 
                    className="poll-card"
                    onClick={() => handlePollClick(poll.id)}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className="poll-header">
                      <h3 className="poll-title">{poll.title}</h3>
                      <div className={`poll-status ${isExpired ? 'expired' : 'active'}`}>
                        {isExpired ? 'Завершен' : 'Активен'}
                      </div>
                    </div>
                    <p className="poll-description">{poll.description}</p>
                    <div className="poll-meta">
                      <div className="poll-stats">
                        <i className="fas fa-users"></i>
                        <span>{poll.total_votes || 0} голосов</span>
                      </div>
                      <div className="poll-info">
                        <div className="poll-info-item">
                          <i className="fas fa-clock"></i>
                          <span>{formatDate(poll.end_date)}</span>
                        </div>
                        <div className="poll-info-item">
                          <i className="fas fa-user-secret"></i>
                          <span>Анонимно</span>
                        </div>
                      </div>
                    </div>
                    <div className="participate-section">
                      <button 
                        className={`participate-btn ${isExpired ? 'disabled' : ''}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePollClick(poll.id);
                        }}
                        disabled={isExpired}
                      >
                        <i className={`fas fa-${hasVoted ? 'chart-bar' : 'vote-yea'}`}></i>
                        {isExpired ? 'Опрос завершен' : 
                          hasVoted ? 'Посмотреть результаты' : 'Участвовать в опросе'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 🔹 Компонент пагинации */}
            <Pagination
              currentPage={filters.page}
              totalPages={pagination.pages}
              onPageChange={handlePageChange}
            />
          </>
        )}
      </main>

      {/* 🔹 Модальное окно создания опроса */}
      <CreatePollModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={handleCreatePoll}
      />
    </div>
  );
};

// 🔹 Компонент шапки
interface HeaderProps {
  user: {
    id?: number | string,
    name: string;
    faculty: string;
  } | null;
  userRole: string | null;
  onLogout: () => void;
}

const Header = ({ user, userRole, onLogout }: HeaderProps) => (
  <header className="header">
    <div className="header-content">
      <div className="user-info">
        <div className="avatar">
          {user?.name ? user.name.charAt(0).toUpperCase() : 'С'}
        </div>
        <div className="user-details">
          <h2>
            {user?.name || `Студент ${user?.id}`}
            {userRole && (
              <span className={`role-badge ${userRole}`}>
                {userRole === USER_ROLES.ADMIN ? 'Админ' : 'Пользователь'}
              </span>
            )}
          </h2>
          <p>{user?.faculty || 'Факультет информатики'}</p>
        </div>
      </div>
      <button className="logout-btn" onClick={onLogout}>
        <i className="fas fa-sign-out-alt"></i>
        Выйти
      </button>
    </div>
  </header>
);

export default Dashboard;