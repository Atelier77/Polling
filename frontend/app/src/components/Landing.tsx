import { Link } from 'react-router-dom';
import { WeatherWidget } from './WeatherWidget';
import SEO from './SEO';
import './Landing.css';

const Landing = () => {
  const features = [
    {
      icon: 'fa-user-secret',
      title: 'Полная анонимность',
      description: 'Все голоса зашифрованы и не могут быть связаны с личностью студента'
    },
    {
      icon: 'fa-chart-bar',
      title: 'Прозрачные результаты',
      description: 'Мгновенная статистика и визуализация результатов голосования'
    },
    {
      icon: 'fa-shield-alt',
      title: 'Безопасность данных',
      description: 'Современные методы шифрования и защиты персональной информации'
    },
    {
      icon: 'fa-users',
      title: 'Для студентов и преподавателей',
      description: 'Удобный интерфейс для всех участников образовательного процесса'
    }
  ];

  const stats = [
    { value: '1000+', label: 'Студентов' },
    { value: '500+', label: 'Опросов' },
    { value: '99.9%', label: 'Доступность' },
    { value: '24/7', label: 'Поддержка' }
  ];

  return (
    <div className="landing-page">
      <SEO
        title="Система анонимных опросов для студентов"
        description="Участвуйте в анонимных голосованиях, создавайте опросы и получайте мгновенные результаты. Безопасно, просто, удобно."
        canonical="https://yoursite.com/"
        ogImage="/og-landing.png"
        ogType="website"
        noIndex={false}
      />

      <script type="application/ld+json">
        {JSON.stringify({
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          "name": "Poll System",
          "applicationCategory": "EducationalApplication",
          "description": "Система анонимных опросов для студентов и преподавателей",
          "offers": {
            "@type": "Offer",
            "price": "0",
            "priceCurrency": "RUB"
          },
          "aggregateRating": {
            "@type": "AggregateRating",
            "ratingValue": "4.8",
            "ratingCount": "150"
          }
        })}
      </script>

      <header className="landing-header" role="banner">
        <nav className="landing-nav" aria-label="Основная навигация">
          <div className="nav-brand">
            <i className="fas fa-poll"></i>
            <span>Poll System</span>
          </div>
          <div className="nav-links">
            <a href="#features" className="nav-link">Возможности</a>
            <a href="#about" className="nav-link">О проекте</a>
            <Link to="/login" className="nav-link btn-login">
              <i className="fas fa-sign-in-alt"></i>
              Войти
            </Link>
            <Link to="/register" className="nav-link btn-register">
              Регистрация
            </Link>
          </div>
        </nav>
      </header>

      <main className="landing-main" role="main">
        <section className="hero-section" aria-labelledby="hero-title">
          <div className="hero-content">
            <h1 id="hero-title">
              Анонимные опросы <span className="highlight">для студентов</span>
            </h1>
            <p className="hero-description">
              Участвуйте в голосованиях, создавайте опросы и получайте мгновенные результаты.
              Полная анонимность и безопасность данных гарантированы.
            </p>
            
            <div className="hero-weather-widget">
              <WeatherWidget />
            </div>
            
            <div className="hero-actions">
              <Link to="/register" className="btn btn-primary btn-large">
                <i className="fas fa-user-plus"></i>
                Начать бесплатно
              </Link>
              <Link to="/login" className="btn btn-secondary btn-large">
                <i className="fas fa-sign-in-alt"></i>
                Уже есть аккаунт
              </Link>
            </div>
            <div className="hero-trust">
              <span><i className="fas fa-check-circle"></i> Без регистрации для голосования</span>
              <span><i className="fas fa-check-circle"></i> Мгновенные результаты</span>
              <span><i className="fas fa-check-circle"></i> Полная анонимность</span>
            </div>
          </div>
          <div className="hero-image">
            <div className="hero-illustration">
              <i className="fas fa-poll-h"></i>
            </div>
          </div>
        </section>

        <section className="stats-section" aria-label="Статистика проекта">
          <div className="stats-container">
            {stats.map((stat, index) => (
              <div key={index} className="stat-item">
                <div className="stat-value">{stat.value}</div>
                <div className="stat-label">{stat.label}</div>
              </div>
            ))}
          </div>
        </section>

        <section id="features" className="features-section" aria-labelledby="features-title">
          <h2 id="features-title">Почему выбирают нас</h2>
          <p className="section-description">
            Всё необходимое для проведения честных и прозрачных опросов
          </p>
          
          <div className="features-grid">
            {features.map((feature, index) => (
              <article key={index} className="feature-card">
                <div className="feature-icon">
                  <i className={`fas ${feature.icon}`}></i>
                </div>
                <h3 className="feature-title">{feature.title}</h3>
                <p className="feature-description">{feature.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="about" className="how-it-works-section" aria-labelledby="how-title">
          <h2 id="how-title">Как это работает</h2>
          
          <div className="steps-container">
            <div className="step">
              <div className="step-number">1</div>
              <h3>Зарегистрируйтесь</h3>
              <p>Создайте аккаунт за 1 минуту с помощью номера студенческого</p>
            </div>
            <div className="step">
              <div className="step-number">2</div>
              <h3>Создайте или найдите опрос</h3>
              <p>Администраторы создают опросы, студенты участвуют в голосованиях</p>
            </div>
            <div className="step">
              <div className="step-number">3</div>
              <h3>Получите результаты</h3>
              <p>Мгновенная статистика и визуализация результатов голосования</p>
            </div>
          </div>
        </section>

        <section className="cta-section" aria-labelledby="cta-title">
          <h2 id="cta-title">Готовы начать?</h2>
          <p>Присоединяйтесь к системе анонимных опросов уже сегодня</p>
          <div className="cta-actions">
            <Link to="/register" className="btn btn-primary btn-large">
              <i className="fas fa-user-plus"></i>
              Зарегистрироваться
            </Link>
            <Link to="/login" className="btn btn-outline btn-large">
              <i className="fas fa-sign-in-alt"></i>
              Войти
            </Link>
          </div>
        </section>
      </main>

      <footer className="landing-footer" role="contentinfo">
        <div className="footer-content">
          <div className="footer-brand">
            <i className="fas fa-poll"></i>
            <span>Poll System</span>
          </div>
          <div className="footer-links">
            <Link to="/login">Вход</Link>
            <Link to="/register">Регистрация</Link>
            <a href="mailto:support@pollsystem.com">Поддержка</a>
          </div>
          <div className="footer-copyright">
            <p>&copy; {new Date().getFullYear()} Poll System. Все права защищены.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;