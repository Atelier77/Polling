Название: Student Poll System
Происхождение: Собственный
Назначение и решаемая проблема: студенческая платформа для создания опросов. Аналитика, исследование и принятие решения
Пользователи/роли: студенты и администратор
3 основные функции: создать опрос, прикрепить баннер к опросу, оставить голос
Стек: FastAPI, React, PostgreSQL
Лицензия: MIT
Команда: только я

Структура:
каталог src/backend/ содержит папку тестирования и основную папку с api, моделями, конфигурацией БД, схемами
Данные хранятся в Объектном хранилище minio S3-Storage и PostgreSQL
Конфигурация задаётся переменными окружения в .env файле
каталог src/frontend содержит папку тестирования и основную папку с сервисами аутентификации и управления данными

Карта пользовательских функций:
create_new_poll  src/backend/src/api/routes/polls.py   src/backend/tests/integration/test_poll_endpoints.py
get_poll         src/backend/src/api/routes/polls.py   src/backend/tests/integration/test_poll_endpoints.py
delete_poll      src/backend/src/api/routes/polls.py   src/backend/tests/integration/test_poll_endpoints.py
check_vote       src/backend/src/api/routes/votes.py   src/backend/tests/integration/test_poll_endpoints.py
vote             src/backend/src/api/routes/votes.py   src/backend/tests/integration/test_vote_endpoints.py
get_user_votes   src/backend/src/api/routes/votes.py  src/backend/tests/integration/test_vote_endpoints.py
get_current_weather   src/backend/src/api/routes/weather.py  src/backend/tests/integration/test_weather_endpoints.py
upload_file | get_file_info   src/backend/src/api/routes/files.py  src/backend/tests/integration/test_file_endpoints.py
register | login | refresh_token | logout  src/backend/src/api/routes/auth.py  src/backend/tests/integration/test_auth_endpoints.py

Состояние инженерных практик:
Присутствуют тесты для бэкенда: e2e, integration, unit
Присутствуют тесты для фронтенда: e2e, unit, сервисов
CI настроен:
есть линтер
проверка типизации через mypy