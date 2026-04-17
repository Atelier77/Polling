// C:\К_3\FS\frontend\app\src\components\Poll.tsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { DataService } from '../services/DataService';
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
}

interface PollProps {
  user: {
    name?: string;
    id?: string | number;
    faculty?: string;
  } | null;
}

const Poll = ({ user }: PollProps) => {
  const { pollId } = useParams<{ pollId: string }>();
  const navigate = useNavigate();
  const [poll, setPoll] = useState<Poll | null>(null);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPollData();
    checkIfVoted();
  }, [pollId]);

  const loadPollData = async () => {
    try {
      setLoading(true);
      const pollData = await DataService.getPollById(Number(pollId));
      if (pollData) {
        setPoll(pollData);
      } else {
        setError('Опрос не найден');
      }
    } catch (err) {
      console.error('Error loading poll:', err);
      setError('Ошибка при загрузке опроса');
    } finally {
      setLoading(false);
    }
  };

  const checkIfVoted = async () => {
    try {
      const voteCheck = await DataService.checkVote(Number(pollId));
      if (voteCheck.has_voted) {
        navigate(`/results/${pollId}`);
      }
    } catch (err) {
      console.warn('Could not check vote status:', err);
    }
  };

  const handleVote = async () => {
    if (!selectedOption) {
      alert('Пожалуйста, выберите вариант ответа');
      return;
    }

    try {
      setVoting(true);
      const result = await DataService.vote(Number(pollId), selectedOption);
      
      if (result.success) {
        navigate(`/results/${pollId}`);
      } else {
        throw new Error('Ошибка при голосовании');
      }
    } catch (err) {
      console.error('Error voting:', err);
      alert('Ошибка при отправке голоса. Попробуйте еще раз.');
    } finally {
      setVoting(false);
    }
  };

  const formatDate = (dateString: string): string => {
    const options: Intl.DateTimeFormatOptions = { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    };
    return new Date(dateString).toLocaleDateString('ru-RU', options);
  };

  if (loading) {
    return (
      <div className="poll-container">
        <Header user={user} />
        <div className="loading-state">
          <i className="fas fa-spinner fa-spin"></i>
          <p>Загрузка опроса...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="poll-container">
        <Header user={user} />
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

  if (!poll) {
    return (
      <div className="poll-container">
        <Header user={user} />
        <div className="error-state">
          <i className="fas fa-exclamation-triangle"></i>
          <h3>Опрос не найден</h3>
          <p>Запрошенный опрос не существует или был удален.</p>
          <Link to="/dashboard" className="back-btn">
            <i className="fas fa-arrow-left"></i>
            Назад к опросам
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="poll-container">
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
            <span>Завершается: {formatDate(poll.end_date)}</span>
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
          {poll.options?.map((option, index) => (
            <div
              key={option.id}
              className={`option-card ${selectedOption === option.id ? 'selected' : ''}`}
              onClick={() => setSelectedOption(option.id)}
            >
              <div className="option-content">
                <div className="option-number">{index + 1}</div>
                <div className="option-text">{option.text}</div>
              </div>
            </div>
          ))}
        </div>
        
        <div className="vote-button-section">
          <button 
            className={`vote-btn ${selectedOption ? 'active' : ''}`}
            onClick={handleVote}
            disabled={!selectedOption || voting}
          >
            {voting ? (
              <>
                <i className="fas fa-spinner fa-spin"></i>
                Отправка...
              </>
            ) : (
              <>
                <i className="fas fa-vote-yea"></i>
                Проголосовать
              </>
            )}
          </button>
        </div>
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
}

const Header = ({ user }: HeaderProps) => (
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
          <h2>{user?.name || `Студент ${user?.id}`}</h2>
          <p>{user?.faculty || 'Факультет информатики'}</p>
        </div>
      </div>
    </div>
  </header>
);

export default Poll;