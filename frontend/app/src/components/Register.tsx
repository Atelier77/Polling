import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthService } from '../services/AuthService';
import './Login.css';

const Register = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    studentId: '',
    password: '',
    confirmPassword: '',
    name: '',
    faculty: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    // Валидация
    if (!formData.studentId.trim()) {
      setError('Введите номер студенческого');
      return;
    }
    
    if (!formData.password) {
      setError('Введите пароль');
      return;
    }
    
    if (formData.password.length < 6) {
      setError('Пароль должен содержать минимум 6 символов');
      return;
    }
    
    if (formData.password !== formData.confirmPassword) {
      setError('Пароли не совпадают');
      return;
    }
    
    if (!formData.name.trim()) {
      setError('Введите ваше имя');
      return;
    }
    
    if (!formData.faculty.trim()) {
      setError('Введите название факультета');
      return;
    }
    
    setLoading(true);
    
    try {
      const result = await AuthService.register(
        formData.studentId,
        formData.password,
        formData.name,
        formData.faculty
      );
      
      if (result.success) {

        navigate('/dashboard', { replace: true });
      } else {
        setError(result.error || 'Ошибка регистрации');
      }
    } catch (err: any) {
      setError(err.message || 'Ошибка сети');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <h2>Регистрация</h2>
        <p className="login-subtitle">Создайте аккаунт для участия в опросах</p>
        
        {error && <div className="error-message">{error}</div>}
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Номер студенческого *</label>
            <input
              type="text"
              name="studentId"
              value={formData.studentId}
              onChange={handleChange}
              placeholder="Например: 777"
              disabled={loading}
            />
          </div>
          
          <div className="form-group">
            <label>Пароль *</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Минимум 6 символов"
              disabled={loading}
            />
          </div>
          
          <div className="form-group">
            <label>Подтвердите пароль *</label>
            <input
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="Повторите пароль"
              disabled={loading}
            />
          </div>
          
          <div className="form-group">
            <label>Ваше имя *</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Иванов Иван"
              disabled={loading}
            />
          </div>
          
          <div className="form-group">
            <label>Факультет *</label>
            <input
              type="text"
              name="faculty"
              value={formData.faculty}
              onChange={handleChange}
              placeholder="Факультет информатики"
              disabled={loading}
            />
          </div>
          
          <button 
            type="submit" 
            className="login-btn"
            disabled={loading}
          >
            {loading ? 'Регистрация...' : 'Зарегистрироваться'}
          </button>
        </form>
        
        <div className="login-footer">
          <p>
            Уже есть аккаунт?{' '}
            <Link to="/login" className="link">
              Войти
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;