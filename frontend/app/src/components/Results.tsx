import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { DataService } from '../services/DataService';
import './Results.css';

interface OptionResult {
  id: number;
  text: string;
  votes: number;
  percentage: number;
}

interface PollResults {
  poll_id: number;
  title: string;
  description: string;
  total_votes: number;
  end_date: string;
  created_at: string;
  options: OptionResult[];
  has_ended: boolean;
}

const Results = () => {
  const { pollId } = useParams<{ pollId: string }>();
  const [results, setResults] = useState<PollResults | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const barColors = [
    'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
    'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
    'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
  ];

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
      
      const data = await DataService.getPollResults(id);
      
      if (!data) {
        setError('Результаты не найдены');
        setLoading(false);
        return;
      }
      
      if (!data.options || !Array.isArray(data.options)) {
        setError('Неверный формат данных');
        setLoading(false);
        return;
      }
      
      setResults(data);
      
    } catch (err: any) {
      console.error('❌ Results: Load error', err);
      setError(err.message || 'Ошибка при загрузке результатов');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="results-container">
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
        <div className="error-state">
          <i className="fas fa-exclamation-triangle"></i>
          <h3>Результаты не найдены</h3>
          <p>{error || 'Запрошенные результаты не существуют или были удалены.'}</p>
          <Link to="/dashboard" className="btn-secondary">
            <i className="fas fa-arrow-left"></i>
            Назад к опросам
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="results-container">
      <header className="results-header">
        <h1 className="results-title">{results.title}</h1>
        <p className="results-description">{results.description}</p>
        
        <div className="results-meta">
          <div className="meta-item">
            <i className="fas fa-users"></i>
            <span><strong>{results.total_votes}</strong> {results.total_votes === 1 ? 'голос' : results.total_votes < 5 ? 'голоса' : 'голосов'}</span>
          </div>
          <div className="meta-item">
            <i className="fas fa-clock"></i>
            <span>{results.has_ended ? 'Завершён' : 'Активен'}</span>
          </div>
        </div>
      </header>

      <section className="results-section" aria-label="Результаты голосования">
        <h2 className="section-title">
          <i className="fas fa-chart-pie"></i>
          Распределение голосов
        </h2>
        
        {results.options && results.options.length > 0 ? (
          <div className="results-bars">
            {results.options.map((option, index) => {
              const barColor = barColors[index % barColors.length];
              
              const maxVotes = Math.max(...results.options.map(o => o.votes));
              const isWinner = option.votes === maxVotes && option.votes > 0;
              
              return (
                <div key={option.id} className="result-bar-container">
                  <div className="result-bar-header">
                    <div className="option-info">
                      <span className="option-number">#{index + 1}</span>
                      <span className="option-text">{option.text}</span>
                    </div>
                    <div className="option-percentage">
                      {option.percentage.toFixed(1)}%
                    </div>
                  </div>
                  
                  <div className="result-bar-wrapper">
                    <div 
                      className="result-bar-fill"
                      style={{ 
                        width: `${Math.max(option.percentage, 0)}%`,
                        background: barColor,
                        animationDelay: `${index * 0.1}s`
                      }}
                    >
                      {option.percentage > 15 && (
                        <span className="bar-votes">{option.votes} голосов</span>
                      )}
                    </div>
                  </div>
                  
                  <div className="result-bar-footer">
                    <span className="votes-count">
                      <i className="fas fa-check-circle"></i>
                      {option.votes} {option.votes === 1 ? 'голос' : option.votes < 5 ? 'голоса' : 'голосов'}
                    </span>
                    {isWinner && (
                      <span className="winner-badge">
                        <i className="fas fa-trophy"></i>
                        Лидер
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="no-results">
            <i className="fas fa-chart-bar fa-3x"></i>
            <p>Голосов пока нет. Будьте первым!</p>
          </div>
        )}
      </section>

      <div className="results-actions">
        <Link to="/dashboard" className="btn-secondary">
          <i className="fas fa-arrow-left"></i>
          К списку опросов
        </Link>
      </div>
    </div>
  );
};

export default Results;