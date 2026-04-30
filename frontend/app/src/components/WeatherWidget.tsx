import { useState, useEffect } from 'react';
import './WeatherWidget.css';

interface WeatherData {
  city: string;
  temperature: number | null;
  feels_like: number | null;
  description: string;
  icon: string | null;
  humidity: number | null;
  wind_speed: number | null;
  is_fallback?: boolean;
  warning?: string;
}

interface WeatherResponse {
  success: boolean;
  data: WeatherData;
  error?: string;
}

export const WeatherWidget = () => {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchWeather();
  }, []);

  const fetchWeather = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('http://localhost:8000/api/weather/current?city=Moscow');
      
      console.log('Weather response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const result: WeatherResponse = await response.json();
      console.log('Weather response data:', result);
      
      if (result.success && result.data) {
        setWeather(result.data);
      } else {
        throw new Error(result.error || 'Неверный формат ответа');
      }
      
    } catch (err: any) {
      console.error('Weather fetch error:', err);
      setError(err.message || 'Не удалось загрузить данные о погоде');
      
      //Graceful degradation
      setWeather({
        city: 'Москва',
        temperature: null,
        feels_like: null,
        description: 'Данные недоступны',
        icon: null,
        humidity: null,
        wind_speed: null,
        is_fallback: true,
        warning: err.message
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="weather-widget loading">
        <div className="spinner"></div>
        <span>Загрузка погоды...</span>
      </div>
    );
  }

  if (error && !weather) {
    return (
      <div className="weather-widget error">
        <i className="fas fa-exclamation-triangle"></i>
        <span>{error}</span>
      </div>
    );
  }

  return (
    <div className={`weather-widget ${weather?.is_fallback ? 'fallback' : ''}`}>
      {weather?.icon && !weather.is_fallback && (
        <img 
          src={`https://openweathermap.org/img/wn/${weather.icon}.png`} 
          alt={weather.description}
          className="weather-icon"
        />
      )}
      
      <div className="weather-info">
        <span className="weather-city">{weather?.city || 'Москва'}</span>
        
        <span className="weather-temp">
          {weather?.temperature != null ? Math.round(weather.temperature) : '--'}°C
        </span>
        
        <span className="weather-desc">
          {weather?.description || 'Нет данных'}
        </span>
        
        {weather?.is_fallback && weather?.warning && (
          <span className="weather-warning">
            <i className="fas fa-exclamation-circle"></i>
            {weather.warning}
          </span>
        )}
      </div>
    </div>
  );
};