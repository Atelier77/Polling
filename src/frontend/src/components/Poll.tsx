import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { DataService } from '../services/DataService';
import { AuthService, USER_ROLES } from '../services/AuthService';
import SEO from './SEO';
import './Poll.css';

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
  banner_url?: string | null;
  created_at?: string;
}

interface PollProps {
  user: {
    name?: string;
    id?: string | number;
    faculty?: string;
    student_id?: string;
  } | null;
  userRole: string | null;
}

const Poll = ({ user, userRole }: PollProps) => {
  const { pollId } = useParams<{ pollId: string }>();
  const navigate = useNavigate();
  
  const [poll, setPoll] = useState<Poll | null>(null);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log('🔍 Poll: Props received:', {
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
    
    loadPollData();
    checkIfVoted();
  }, [pollId]);

  const loadPollData = async () => {
    try {
      setLoading(true);
      setError(null);

      const id = Number(pollId);
      
      if (!id || isNaN(id)) {
        setError('Неверный ID опроса');
        setLoading(false);
        return;
      }

      console.log('🔍 Poll: Loading poll', id);
      const pollData = await DataService.getPollById(id);
      
      if (pollData) {
        setPoll(pollData);
      } else {
        setError('Опрос не найден');
      }
    } catch (err: any) {
      console.error('❌ Poll: Load error:', err);
      setError(err.message || 'Ошибка при загрузке опроса');
    } finally {
      setLoading(false);
    }
  };

  const checkIfVoted = async () => {
    try {
      if (!pollId) return;
      
      const id = Number(pollId);
      if (!id || isNaN(id)) return;

      const hasVotedLocally = DataService.hasVotedLocally(id);
      if (hasVotedLocally) {
        navigate(`/results/${pollId}`, { replace: true });
        return;
      }

      const voteCheck = await DataService.checkVote(id);
      if (voteCheck.has_voted) {
        navigate(`/results/${pollId}`, { replace: true });
      }
    } catch (err) {
      console.warn('Could not check vote status:', err);
    }
  };

  const handleVote = async () => {
    if (!selectedOption) {
      setError('Пожалуйста, выберите вариант ответа');
      return;
    }

    if (!pollId) {
      setError('ID опроса не указан');
      return;
    }

    try {
      setVoting(true);
      setError(null);

      const id = Number(pollId);
      if (!id || isNaN(id)) {
        setError('Неверный ID опроса');
        return;
      }

      console.log('🔍 Poll: Submitting vote:', {
        pollId: id,
        optionId: selectedOption
      });

      const result = await DataService.vote(id, selectedOption);
      
      console.log('🔍 Poll: Vote result:', result);
      
      if (result.success) {
        navigate(`/results/${pollId}`, { replace: true });
      } else {
        throw new Error(result.error || 'Ошибка при голосовании');
      }
    } catch (err: any) {
      console.error('Poll: Vote error:', err);
      setError(err.message || 'Ошибка при отправке голоса. Попробуйте еще раз.');
    } finally {
      setVoting(false);
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

  const isPollExpired = (endDate: string): boolean => {
    if (!endDate) return false;
    return new Date() > new Date(endDate);
  };

  if (loading) {
    return (
      <div className="poll-container">
        <SEO
          title="Загрузка опроса"
          description="Пожалуйста, подождите..."
          noIndex={true}
        />
        <Header user={user} />
        <div className="loading-state">
          <i className="fas fa-spinner fa-spin"></i>
          <p>Загрузка опроса...</p>
        </div>
      </div>
    );
  }

  if (error || !poll) {
    return (
      <div className="poll-container">
        <SEO
          title="Ошибка"
          description="Не удалось загрузить опрос"
          noIndex={true}
        />
        <Header user={user} />
        <div className="error-state">
          <i className="fas fa-exclamation-triangle"></i>
          <h3>{error || 'Опрос не найден'}</h3>
          <p>{!poll ? 'Запрошенный опрос не существует или был удален.' : ''}</p>
          <Link to="/dashboard" className="back-btn">
            <i className="fas fa-arrow-left"></i>
            Назад к опросам
          </Link>
        </div>
      </div>
    );
  }

  const expired = isPollExpired(poll.end_date);

  return (
    <div className="poll-container">

      <SEO
        title={poll.title}
        description={poll.description}
        canonical={`https://index_poll.com/poll/${pollId}`}
        ogImage={poll.banner_url || '/og-default.png'}
        ogType="article"
      />

      <script type="application/ld+json">
        {JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Survey",
          "name": poll?.title,
          "description": poll?.description,
          "startDate": poll?.created_at,
          "endDate": poll?.end_date,
          "publisher": {
            "@type": "Organization",
            "name": "Poll System"
          }
        })}
      </script>

      <Header user={user} />
      
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
            <span>{expired ? 'Завершен' : `Завершается: ${formatDate(poll.end_date)}`}</span>
          </div>
          <div className="poll-meta-item">
            <i className="fas fa-users"></i>
            <span>{poll.total_votes || 0} голосов</span>
          </div>
        </div>
      </div>

      <div className="options-section">
        <div className="options-header">
          <h2>Выберите вариант ответа:</h2>
          <p>Кликните на карточку с интересующим вас вариантом</p>
        </div>
        
        <div className="option-cards">
          {poll.options && poll.options.length > 0 ? (
            poll.options.map((option, index) => (
              <div
                key={option.id}
                className={`option-card ${selectedOption === option.id ? 'selected' : ''}`}
                onClick={() => setSelectedOption(option.id)}
                role="radio"
                aria-checked={selectedOption === option.id}
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    setSelectedOption(option.id);
                  }
                }}
              >
                <div className="option-content">
                  <div className="option-number">{index + 1}</div>
                  <div className="option-text">{option.text}</div>
                </div>
              </div>
            ))
          ) : (
            <div className="no-options">
              <i className="fas fa-inbox"></i>
              <p>Варианты ответов отсутствуют</p>
            </div>
          )}
        </div>
        
        <div className="vote-button-section">
          <button 
            className={`vote-btn ${selectedOption ? 'active' : ''}`}
            onClick={handleVote}
            disabled={!selectedOption || voting || expired}
            aria-label="Проголосовать"
          >
            {voting ? (
              <>
                <i className="fas fa-spinner fa-spin"></i>
                Отправка...
              </>
            ) : expired ? (
              <>
                <i className="fas fa-lock"></i>
                Опрос завершен
              </>
            ) : (
              <>
                <i className="fas fa-vote-yea"></i>
                Проголосовать
              </>
            )}
          </button>
        </div>

        {error && (
          <div className="error-message" role="alert">
            <i className="fas fa-exclamation-circle"></i>
            {error}
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

export default Poll;