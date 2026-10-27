import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { DataService } from '../services/DataService';
import { AuthService, USER_ROLES } from '../services/AuthService';
import CreatePollModal from './CreatePollModal';
import { PollBannerUpload } from './PollBannerUpload';
import { PollFilters, FilterState } from './PollFilters';
import { Pagination } from './Pagination';
import { SEO } from './SEO';
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

const Dashboard = ({ user, userRole, onLogout, adminView }: DashboardProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  
  useEffect(() => {
    console.log('Dashboard: Props received:', {
      userName: user?.name,
      userStudentId: user?.student_id,
      userRole: userRole,
      isAdmin: (userRole?.toLowerCase() === USER_ROLES.ADMIN) || adminView
    });
  }, [user, userRole, adminView]);

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

  const isAdmin = (userRole?.toLowerCase() === USER_ROLES.ADMIN) || adminView;

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const loadedFilters: Partial<FilterState> = {};
    
    if (params.get('search')) loadedFilters.search = params.get('search')!;
    if (params.get('status')) loadedFilters.status = params.get('status') as FilterState['status'];
    if (params.get('sortBy')) loadedFilters.sortBy = params.get('sortBy') as FilterState['sortBy'];
    if (params.get('sortOrder')) loadedFilters.sortOrder = params.get('sortOrder') as FilterState['sortOrder'];
    if (params.get('page')) loadedFilters.page = parseInt(params.get('page')!, 10);
    if (params.get('limit')) loadedFilters.limit = parseInt(params.get('limit')!, 10);
    if (params.get('faculty')) loadedFilters.faculty = params.get('faculty')!;
    
    if (Object.keys(loadedFilters).length > 0) {
      setFilters(prev => {

        const newFilters = { ...prev, ...loadedFilters };
        const isDifferent = JSON.stringify(prev) !== JSON.stringify(newFilters);
        return isDifferent ? newFilters : prev;
      });
    }
  }, [location.search]);

  useEffect(() => {
    const params = new URLSearchParams();
    
    if (filters.search) params.set('search', filters.search);
    if (filters.status !== 'all') params.set('status', filters.status);
    params.set('sortBy', filters.sortBy);
    params.set('sortOrder', filters.sortOrder);
    if (filters.page > 1) params.set('page', filters.page.toString());
    if (filters.limit !== 10) params.set('limit', filters.limit.toString());
    if (filters.faculty) params.set('faculty', filters.faculty);
    
    const queryString = params.toString();
    const currentQuery = location.search;
    
    if (queryString !== currentQuery) {
      navigate(`?${queryString}`, { replace: true });
    }
  }, [filters, navigate, location.search]);
  
  useEffect(() => {
    loadPolls();
  }, [filters]);

  const loadPolls = async () => {
    console.log('loadPolls: STARTED');
    
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

      const queryString = params.toString();
      console.log('loadPolls: Fetching /api/polls/?' + queryString);
      
      const data = await DataService.getPolls(queryString);
      
      console.log('loadPolls: Response received:', data);
      
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
      
      console.log('loadPolls: COMPLETED');
      
    } catch (err) {
      console.error('loadPolls: ERROR:', err);
      setError('Не удалось загрузить опросы. Проверьте подключение к серверу.');
    } finally {
      setLoading(false);
      console.log('loadPolls: finally block executed, loading=false');
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

  if (!user && loading) {
    return (
      <div className="dashboard-container">
        <div className="loading-state">
          <i className="fas fa-spinner fa-spin"></i>
          <p>Загрузка профиля...</p>
        </div>
      </div>
    );
  }

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
    <SEO
      title="Доступные опросы"
      description="Участвуйте в анонимных опросах и голосуйте за важные решения"
      canonical={window.location.href}
      ogImage="/og-dashboard.png"
    />
    
    <Header user={user} userRole={userRole} onLogout={onLogout} />
    
    <main className="dashboard-main" role="main">
      <header className="dashboard-header">
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
      </header>

      <section className="filters-section" aria-label="Фильтры опросов">
        <PollFilters 
          initialFilters={filters}
          onFiltersChange={handleFiltersChange}
        />
      </section>

      {error && (
        <div className="error-alert" role="alert">
          <i className="fas fa-exclamation-circle"></i>
          {error}
        </div>
      )}

      <section className="polls-section" aria-label="Список опросов">
        {polls.length === 0 && !loading ? (
          <article className="empty-state" aria-labelledby="empty-title">
            <i className="fas fa-inbox" aria-hidden="true"></i>
            <h2 id="empty-title">Нет доступных опросов</h2>
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
          </article>
        ) : (
          <div className="polls-grid" role="list">
            {polls.map(poll => {
              const hasVoted = DataService.hasVotedLocally(poll.id);
              const isExpired = isPollExpired(poll.end_date);
              
              return (
                <article 
                  key={poll.id} 
                  className="poll-card"
                  aria-labelledby={`poll-title-${poll.id}`}
                  role="listitem"
                >
                  {poll.banner_url && (
                    <div className="poll-banner">
                      <img 
                        src={poll.banner_url} 
                        alt={`Баннер опроса: ${poll.title}`} 
                        className="banner-image"
                        loading="lazy"
                        decoding="async"
                        width="400"
                        height="200"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    </div>
                  )}
                  
                  <header className="poll-header">
                    <h2 id={`poll-title-${poll.id}`} className="poll-title">
                      {poll.title}
                    </h2>
                    <div className={`poll-status ${isExpired ? 'expired' : 'active'}`} aria-label={isExpired ? 'Опрос завершен' : 'Опрос активен'}>
                      {isExpired ? 'Завершен' : 'Активен'}
                    </div>
                  </header>
                  
                  <p className="poll-description">{poll.description}</p>
                  
                  <div className="poll-meta">
                    <div className="poll-stats">
                      <i className="fas fa-users" aria-hidden="true"></i>
                      <span>{poll.total_votes || 0} голосов</span>
                    </div>
                    <div className="poll-info">
                      <div className="poll-info-item">
                        <i className="fas fa-clock" aria-hidden="true"></i>
                        <span>{formatDate(poll.end_date)}</span>
                      </div>
                      <div className="poll-info-item">
                        <i className="fas fa-user-secret" aria-hidden="true"></i>
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
                      aria-label={isExpired ? 'Опрос завершен' : hasVoted ? 'Посмотреть результаты' : 'Участвовать в опросе'}
                    >
                      <i className={`fas fa-${hasVoted ? 'chart-bar' : 'vote-yea'}`} aria-hidden="true"></i>
                      {isExpired ? 'Опрос завершен' : 
                        hasVoted ? 'Посмотреть результаты' : 'Участвовать в опросе'}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {pagination.pages > 1 && (
        <nav className="pagination-nav" aria-label="Навигация по страницам">
          <Pagination
            currentPage={filters.page}
            totalPages={pagination.pages}
            onPageChange={handlePageChange}
          />
        </nav>
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
    id?: number | string;
    student_id: string;
    name: string;
    faculty: string;
  } | null;
  userRole: string | null;
  onLogout: () => void;
}

const Header = ({ user, userRole, onLogout }: HeaderProps) => {
  const displayName = user?.name 
    ? user.name 
    : user?.student_id 
      ? `Студент ${user.student_id}` 
      : 'Студент';
  
  const displayRole = userRole?.toLowerCase() === USER_ROLES.ADMIN ? 'Админ' : 'Пользователь';
  
  return (
    <header className="header">
      <div className="header-content">
        <div className="user-info">
          <div className="avatar">
            {displayName.charAt(0).toUpperCase()}
          </div>
          <div className="user-details">
            <h2>
              {displayName}
              {userRole && (
                <span className={`role-badge ${userRole}`}>
                  {displayRole}
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
};

export default Dashboard;