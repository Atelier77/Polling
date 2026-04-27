import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthService } from '../services/AuthService';
import { SEO } from './SEO';
import './Login.css';

interface LoginProps {
  onLogin: (studentId: string, password: string) => Promise<void>;
}

const Login = ({ onLogin }: LoginProps) => {
  const navigate = useNavigate();
  const [studentId, setStudentId] = useState('');
  const [password, setPassword] = useState(''); 
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!studentId.trim()) {
      setError('Введите номер студенческого');
      return;
    }
    
    if (!password) { 
      setError('Введите пароль');
      return;
    }
    
    setLoading(true);
    
    try {
      const result = await AuthService.login(studentId, password);
      
      if (result.success) {
        await onLogin(studentId, password);
        navigate('/dashboard', { replace: true });
      } else {
        setError(result.error || 'Ошибка входа');
      }
    } catch (err: any) {
      setError(err.message || 'Ошибка сети');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <SEO
        title="Вход в систему"
        description="Войдите для участия в опросах"
        noIndex={true}
      />
      <div className="login-box">
        <h2>Вход в систему</h2>
        <p className="login-subtitle">Введите ваши данные для входа</p>
        
        {error && <div className="error-message">{error}</div>}
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Номер студенческого</label>
            <input
              type="text"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              placeholder="Например: 777"
              disabled={loading}
            />
          </div>
          
          <div className="form-group">
            <label>Пароль</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Введите пароль"
              disabled={loading}
            />
          </div>
          
          <button 
            type="submit" 
            className="login-btn"
            disabled={loading}
          >
            {loading ? 'Вход...' : 'Войти'}
          </button>
        </form>
        
        <div className="login-footer">
          <p>
            Нет аккаунта?{' '}
            <Link to="/register" className="link">
              Зарегистрироваться
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;