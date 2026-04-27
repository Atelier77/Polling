import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { DataService } from '../services/DataService';
import { AuthService, USER_ROLES } from '../services/AuthService';
import SEO from './SEO';
import './Results.css';

interface OptionResult {
  id: number;
  text: string;
  votes: number;
  percentage?: number;
}

interface PollResult {
  id: number;
  title: string;
  description: string;
  end_date: string;
  total_votes: number;
  options: OptionResult[];
  created_at: string;
  banner_url?: string | null;
  has_ended?: boolean;
}

interface ResultsProps {
  user: {
    name?: string;
    id?: string | number;
    faculty?: string;
    student_id?: string;
  } | null;
  userRole: string | null;
}

const Results = ({ user, userRole }: ResultsProps) => {
  const { pollId } = useParams<{ pollId: string }>();
  const navigate = useNavigate();
  
  const [results, setResults] = useState<PollResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log('🔍 Results: Props received:', {
      userName: user?.name,
      userRole: userRole,
      pollId: pollId
    });
  }, [user, userRole, pollId]);

  useEffect(() => {
    if (!pollId) {
      setError('ID опроса не указан');
      setLoading(false);
      return;
    }
    
    loadResults();
  }, [pollId]);

  const loadResults = async () => {
    try {
      setLoading(true);
      setError(null);

      const id = Number(pollId);
      if (!id || isNaN(id)) {
        setError('Неверный ID опроса');
        setLoading(false);
        return;
      }

      console.log('🔍 Results: Loading results for poll', id);
      const data = await DataService.getPollResults(id);
      
      if (data?.poll) {
        const totalVotes = data.total_votes || data.poll.total_votes || 0;
        const optionsWithPercent = data.options?.map(opt => ({
          ...opt,
          percentage: totalVotes > 0 ? Math.round((opt.votes / totalVotes) * 100) : 0
        })) || [];
        
        setResults({
          ...data.poll,
          options: optionsWithPercent,
          total_votes: totalVotes,
          has_ended: data.has_ended || new Date() > new Date(data.poll.end_date)
        });
      } else {
        setError('Результаты не найдены');
      }
    } catch (err: any) {
      console.error('Results: Load error:', err);
      setError(err.message || 'Ошибка при загрузке результатов');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string): string => {
    if (!dateString) return 'Дата не указана';
    
    const options: Intl.DateTimeFormatOptions = { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    };
    return new Date(dateString).toLocaleDateString('ru-RU', options);
  };

  const getBarWidth = (percentage: number): string => {
    return percentage === 0 ? '2px' : `${Math.max(percentage, 2)}%`;
  };

  const getBarColor = (index: number): string => {
    const colors = [
      'var(--color-primary)',
      'var(--color-secondary)',
      'var(--color-accent)',
      'var(--color-success)',
      'var(--color-warning)'
    ];
    return colors[index % colors.length];
  };

  if (loading) {
    return (
      <div className="results-container">
        <SEO
          title="Загрузка результатов"
          description="Пожалуйста, подождите..."
          noIndex={true}
        />
        <Header user={user} />
        <div className="loading-state">
          <i className="fas fa-spinner fa-spin"></i>
          <p>Загрузка результатов...</p>
        </div>
      </div>
    );
  }

  if (error || !results) {
    return (
      <div className="results-container">
        <SEO
          title="Ошибка"
          description="Не удалось загрузить результаты"
          noIndex={true}
        />
        <Header user={user} />
        <div className="error-state">
          <i className="fas fa-exclamation-triangle"></i>
          <h3>{error || 'Результаты не найдены'}</h3>
          <p>{!results ? 'Запрошенные результаты не существуют или были удалены.' : ''}</p>
          <Link to="/dashboard" className="back-btn">
            <i className="fas fa-arrow-left"></i>
            Назад к опросам
          </Link>
        </div>
      </div>
    );
  }

  const isAdmin = userRole === USER_ROLES.ADMIN;

  return (
    <div className="results-container">
      <SEO
        title={`Результаты: ${results.title}`}
        description={`Результаты голосования: ${results.description?.substring(0, 150)}...`}
        canonical={`https://yoursite.com/results/${pollId}`}
        ogImage={results.banner_url || '/og-default.png'}
        ogType="article"
      />

      <script type="application/ld+json">
        {JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Survey",
          "name": results.title,
          "description": results.description,
          "endDate": results.end_date,
          "publisher": {
            "@type": "Organization",
            "name": "Poll System"
          },
          "aggregateRating": {
            "@type": "AggregateRating",
            "ratingCount": results.total_votes,
            "bestRating": 100,
            "worstRating": 0
          }
        })}
      </script>

      <Header user={user} />
      
      <main className="results-main" role="main">
        <article className="results-article" aria-labelledby="results-title">
          {results.banner_url && (
            <div className="results-banner">
              <img 
                src={results.banner_url} 
                alt={`Баннер опроса: ${results.title}`}
                className="banner-image"
                loading="lazy"
              />
            </div>
          )}

          <h1 id="results-title" className="results-title">{results.title}</h1>
          
          <p className="results-description">{results.description}</p>

          <div className="results-meta">
            <div className="meta-item">
              <i className="fas fa-users"></i>
              <span><strong>{results.total_votes}</strong> голосов</span>
            </div>
            <div className="meta-item">
              <i className="fas fa-clock"></i>
              <span>{results.has_ended ? 'Завершен' : `До ${formatDate(results.end_date)}`}</span>
            </div>
            {isAdmin && (
              <div className="meta-item admin-badge">
                <i className="fas fa-shield-alt"></i>
                <span>Администратор</span>
              </div>
            )}
          </div>

          <section className="results-section" aria-label="Результаты голосования">
            <h2 className="section-title">Распределение голосов</h2>
            
            {results.options && results.options.length > 0 ? (
              <div className="results-bars">
                {results.options.map((option, index) => (
                  <div key={option.id} className="result-bar-container">
                    <div className="result-bar-label">
                      <span className="option-text">{option.text}</span>
                      <span className="option-stats">
                        {option.votes} голосов ({option.percentage}%)
                      </span>
                    </div>
                    <div className="result-bar-wrapper">
                      <div 
                        className="result-bar"
                        style={{ 
                          width: getBarWidth(option.percentage || 0),
                          backgroundColor: getBarColor(index)
                        }}
                        role="progressbar"
                        aria-valuenow={option.percentage}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-label={`${option.text}: ${option.percentage}%`}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="no-results">
                <i className="fas fa-chart-bar"></i>
                <p>Голосов пока нет</p>
              </div>
            )}
          </section>

          <div className="results-actions">
            <Link to="/dashboard" className="btn-secondary">
              <i className="fas fa-arrow-left"></i>
              К списку опросов
            </Link>
            
            {results.has_ended ? (
              <button className="btn-primary" disabled>
                <i className="fas fa-lock"></i>
                Голосование завершено
              </button>
            ) : (
              <Link to={`/poll/${pollId}`} className="btn-primary">
                <i className="fas fa-vote-yea"></i>
                Проголосовать
              </Link>
            )}
          </div>
        </article>
      </main>
    </div>
  );
};

interface HeaderProps {
  user: {
    name?: string;
    id?: string | number;
    faculty?: string;
    student_id?: string;
  } | null;
}

const Header = ({ user }: HeaderProps) => {
  const displayName = user?.name 
    ? user.name 
    : user?.student_id 
      ? `Студент ${user.student_id}` 
      : user?.id 
        ? `Студент ${user.id}` 
        : 'Студент';
  
  return (
    <header className="header">
      <div className="header-content">
        <Link to="/dashboard" className="back-btn">
          <i className="fas fa-arrow-left"></i>
          Назад к опросам
        </Link>
        <div className="user-info">
          <div className="avatar">
            {displayName.charAt(0).toUpperCase()}
          </div>
          <div className="user-details">
            <h2>{displayName}</h2>
            <p>{user?.faculty || 'Факультет информатики'}</p>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Results;