// C:\К_3\FS\frontend\app\src\components\Results.tsx
import { useState, useEffect } from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import { DataService } from '../services/DataService';
import { AuthService, USER_ROLES } from '../services/AuthService';
import './Results.css';

interface Option {
  id: number;
  text: string;
  votes: number;
}

interface Poll {
  id: number;
  title: string;
  description: string;
  end_date: string;
  total_votes: number;
  options?: Option[];
}

interface ResultsData {
  poll: Poll;
  options: Array<Option & { percentage?: number }>;
}

interface ResultsProps {
  user: {
    name?: string;
    id?: string | number;
    faculty?: string;
  } | null;
  userRole: string | null;
}

const Results = ({ user, userRole }: ResultsProps) => {
  const { pollId } = useParams<{ pollId: string }>();
  const [poll, setPoll] = useState<Poll | null>(null);
  const [results, setResults] = useState<ResultsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasVoted, setHasVoted] = useState(false);

  useEffect(() => {
    loadResults();
    checkVoteStatus();
  }, [pollId]);
      
  const loadResults = async () => {
    try {
      setLoading(true);
      const resultsData = await DataService.getPollResults(Number(pollId));
      if (resultsData) {
        setResults(resultsData);
        setPoll(resultsData.poll);
      } else {
        const pollData = await DataService.getPollById(Number(pollId));
        if (pollData) {
          setPoll(pollData);
          setResults({ poll: pollData, options: pollData.options || [] });
        } else {
          setError('Опрос не найден');
        }
      }
    } catch (err) {
      console.error('Error loading results:', err);
      const errorMessage = err instanceof Error ? err.message : '';
      if (errorMessage.includes('403') || errorMessage.includes('прав')) {
        setError('Недостаточно прав для просмотра результатов');
      } else {
        setError('Ошибка при загрузке результатов');
      }
    } finally {
      setLoading(false);
    }
  };

  const checkVoteStatus = async () => {
    try {
      const voteCheck = await DataService.checkVote(Number(pollId));
      setHasVoted(voteCheck.has_voted);
    } catch (err) {
      const localVoted = DataService.hasVotedLocally(Number(pollId));
      setHasVoted(localVoted);
    }
  };

  const canViewResults = (): boolean => {
    if (AuthService.hasRole(USER_ROLES.ADMIN)) return true;
    if (AuthService.hasRole(USER_ROLES.USER)) {
      if (hasVoted) return true;
      if (poll?.end_date && new Date() > new Date(poll.end_date)) return true;
    }
    return false;
  };

  const formatDate = (dateString: string): string => {
    const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('ru-RU', options);
  };

  if (!loading && !canViewResults()) {
    return <Navigate to="/dashboard" replace />;
  }

  if (loading) {
    return (
      <div className="results-container">
        <Header user={user} userRole={userRole} />
        <div className="loading-state">
          <i className="fas fa-spinner fa-spin"></i>
          <p>Загрузка результатов...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="results-container">
        <Header user={user} userRole={userRole} />
        <div className="error-state">
          <i className="fas fa-exclamation-triangle"></i>
          <h3>Ошибка</h3>
          <p>{error}</p>
          <Link to="/dashboard" className="back-btn">
            <i className="fas fa-arrow-left"></i>
            Назад к опросам
          </Link>
        </div>
      </div>
    );
  }

  if (!poll || !results) {
    return (
      <div className="results-container">
        <Header user={user} userRole={userRole} />
        <div className="error-state">
          <i className="fas fa-exclamation-triangle"></i>
          <h3>Данные не найдены</h3>
          <p>Не удалось загрузить результаты опроса.</p>
          <Link to="/dashboard" className="back-btn">
            <i className="fas fa-arrow-left"></i>
            Назад к опросам
          </Link>
        </div>
      </div>
    );
  }

  const totalVotes = poll.total_votes || results.options?.reduce((sum, opt) => sum + (opt.votes || 0), 0) || 0;

  return (
    <div className="results-container">
      <Header user={user} userRole={userRole} />
      
      <div className="poll-info-card">
        <div className="poll-header">
          <h1 className="poll-title">{poll.title}</h1>
          <div className="anonymity-badge">
            <i className="fas fa-user-secret"></i>
            Анонимное голосование
          </div>
        </div>
        <p className="poll-description">{poll.description}</p>
        <div className="poll-meta">
          <div className="poll-meta-item">
            <i className="fas fa-clock"></i>
            <span>Завершается: {formatDate(poll.end_date)}</span>
          </div>
          <div className="poll-meta-item">
            <i className="fas fa-users"></i>
            <span>{totalVotes} голосов</span>
          </div>
          <div className="poll-meta-item">
            <i className={`fas fa-${hasVoted ? 'check-circle' : 'eye'}`}></i>
            <span>{hasVoted ? 'Вы проголосовали' : 'Только просмотр'}</span>
          </div>
        </div>
      </div>

      <div className="results-section">
        <div className="results-header">
          <h2 className="results-title">Результаты голосования</h2>
          {AuthService.hasRole(USER_ROLES.ADMIN) && (
            <div className="admin-actions">
              <button className="admin-btn" title="Экспорт результатов">
                <i className="fas fa-download"></i>
              </button>
              <button className="admin-btn" title="Управление опросом">
                <i className="fas fa-cog"></i>
              </button>
            </div>
          )}
        </div>

        <div className="results-items">
          {results.options?.length > 0 ? (
            results.options.map((option, index) => {
              const percentage = totalVotes > 0 ? Math.round((option.votes / totalVotes) * 100) : 0;
              return (
                <div key={option.id} className="result-item">
                  <div className="result-header">
                    <div className="result-option">
                      <div className="result-option-number">{index + 1}</div>
                      {option.text}
                    </div>
                    <div className="result-stats">
                      {percentage}% ({option.votes || 0})
                    </div>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${percentage}%` }}></div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="no-results">
              <i className="fas fa-chart-bar"></i>
              <p>Нет данных для отображения</p>
            </div>
          )}
        </div>

        {hasVoted && (
          <div className="success-notice">
            <div className="success-icon"><i className="fas fa-check-circle"></i></div>
            <h3 className="success-title">Ваш голос учтен!</h3>
            <p className="success-text">
              Благодарим за участие в голосовании. {totalVotes > 0 ? 'Результаты обновлены в реальном времени.' : 'Будьте первым, кто проголосует!'}
            </p>
          </div>
        )}
        
        {!hasVoted && AuthService.hasRole(USER_ROLES.USER) && (
          <div className="info-notice">
            <i className="fas fa-info-circle"></i>
            <p>Вы ещё не проголосовали в этом опросе. 
              {poll.end_date && new Date() > new Date(poll.end_date) 
                ? ' Опрос завершён, результаты доступны для просмотра.' 
                : ' Проголосуйте, чтобы увидеть детальные результаты.'}
            </p>
            {! (poll.end_date && new Date() > new Date(poll.end_date)) && (
              <Link to={`/poll/${pollId}`} className="vote-link">
                Перейти к голосованию →
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

interface HeaderProps {
  user: {
    name?: string;
    id?: string | number;
    faculty?: string;
  } | null;
  userRole: string | null;
}

const Header = ({ user, userRole }: HeaderProps) => (
  <header className="header">
    <div className="header-content">
      <Link to="/dashboard" className="back-btn">
        <i className="fas fa-arrow-left"></i>
        Назад к опросам
      </Link>
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
    </div>
  </header>
);

export default Results;