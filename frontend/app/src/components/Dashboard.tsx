import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DataService } from '../services/DataService';
import { AuthService, USER_ROLES } from '../services/AuthService';
import CreatePollModal from './CreatePollModal';
import { PollBannerUpload } from './PollBannerUpload';
import { PollFilters, FilterState } from './PollFilters';
import { Pagination } from './Pagination';
import './Dashboard.css';

export interface Poll {
  id: number;
  title: string;
  description: string;
  end_date: string;
  total_votes: number;
  created_at: string;
  banner_file_id?: number | null;
  banner_url?: string | null;
  options?: Array<{
    id: number;
    text: string;
    votes: number;
  }>;
}

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
  adminView?: boolean;
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
  
  const [showBannerModal, setShowBannerModal] = useState(false);
  const [currentPollId, setCurrentPollId] = useState<number | null>(null);
  const [currentPollTitle, setCurrentPollTitle] = useState<string>('');
  const [currentBannerUrl, setCurrentBannerUrl] = useState<string | null>(null);

  const isAdmin = userRole === USER_ROLES.ADMIN;

  useEffect(() => {
    loadPolls();
  }, [filters]);

  const loadPolls = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      
      if (filters.search) params.append('search', filters.search);
      if (filters.status !== 'all') params.append('status', filters.status);
      params.append('sort_by', filters.sortBy);
      params.append('sort_order', filters.sortOrder);
      params.append('page', filters.page.toString());
      params.append('limit', filters.limit.toString());

      const data = await DataService.getPolls(params.toString());
      
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

      const response = await fetch('http://localhost:8000/api/polls/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(pollData)
      });

      if (response.ok) {
        const createdPoll = await response.json();
        await loadPolls();
        return {
          id: createdPoll.id,
          title: createdPoll.title
        };
      } else {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = typeof errorData.detail === 'string' 
          ? errorData.detail 
          : 'Ошибка при создании опроса';
        alert(errorMessage);
        throw new Error(errorMessage);
      }
    } catch (err) {
      console.error('Error creating poll:', err);
      alert(err instanceof Error ? err.message : 'Ошибка сети');
      throw err;
    }
  };

  const handlePollCreated = (pollId: number, pollTitle: string) => {
    setCurrentPollId(pollId);
    setCurrentPollTitle(pollTitle);
    
    const poll = polls.find(p => p.id === pollId);
    setCurrentBannerUrl(poll?.banner_url || null);
    
    setShowBannerModal(true);
  };

  const handleBannerUploaded = () => {
    setShowBannerModal(false);
    setCurrentPollId(null);
    setCurrentPollTitle('');
    setCurrentBannerUrl(null);
    
    loadPolls();
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
                    {poll.banner_url && (
                      <div className="poll-banner">
                        <img 
                          src={poll.banner_url} 
                          alt={poll.title}
                          className="banner-image"
                          onError={(e) => (e.currentTarget.style.display = 'none')}
                        />
                      </div>
                    )}
                    
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

            <Pagination
              currentPage={filters.page}
              totalPages={pagination.pages}
              onPageChange={handlePageChange}
            />
          </>
        )}
      </main>

      <CreatePollModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={handleCreatePoll}
        onPollCreated={handlePollCreated}
      />

      {showBannerModal && currentPollId && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowBannerModal(false)}>
          <div className="modal-content" style={{ maxWidth: '650px', maxHeight: '90vh', overflowY: 'auto' }}>
            <PollBannerUpload
              pollId={currentPollId}
              pollTitle={currentPollTitle}
              currentBannerUrl={currentBannerUrl}
              onBannerUploaded={handleBannerUploaded}
              onBack={() => setShowBannerModal(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
};


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