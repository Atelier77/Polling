Poll System

Запуск:
git clone https://github.com/Atelier77/Polling

- Установленный [Docker](https://www.docker.com/) и Docker Compose.
1. Клонируйте репозиторий:
git clone https://github.com/Atelier77/Polling
cd FS
2. Скопируйте файл с переменными окружения и заполните его (если требуется):
cp .env.example .env
3. Запустите проект:
docker-compose up -d --build

## Статус требований

| ID | Краткое описание | Приоритет | Состояние |
|:---|:---|:---:|:---|
| **FR-1** | Регистрация по студенческому билету | Обязательно | Нужно доработать |
| **FR-2** | Аутентификация (вход/выход) | Обязательно | Уже есть |
| **FR-3** | Создание опроса | Обязательно | Уже есть |
| **FR-4** | Прикрепление баннера к опросу | Желательно | Уже есть |
| **FR-5** | Голосование в опросе | Обязательно | Уже есть |
| **FR-6** | Удаление опроса (Админ) | Обязательно | Нужно доработать |
| **FR-7** | Просмотр результатов и проверка голоса | Желательно | Уже есть |

## Тестирование

Для запуска автоматических тестов локально выполните следующие команды из корня репозитория:

```bash
# Переход в директорию
cd src/backend

# Запуск теста
python -m pytest tests/integration/test_poll_endpoints.py
```

**Демонстрация .github/workflows/ci.yml**
```
name: CI/CD Pipeline

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]
  workflow_dispatch:
  ```

**Демонстрация добавленного линтера(ruff) и проверки типизации(mypy)**
```
  - name: Run linter (ruff)
        working-directory: ./src/backend
        run: |
          ruff check src/ tests/ --exit-zero
          ruff format src/ tests/ --check --diff

      - name: Run type checker (mypy)
        working-directory: ./src/backend
        run: |
          mypy src/ \
            --ignore-missing-imports \
            --pretty \
            --disable-error-code=assignment \
            --disable-error-code=attr-defined \
            --disable-error-code=return-value \
            --disable-error-code=arg-type \
            --disable-error-code=call-arg \
            --disable-error-code=misc \
            --disable-error-code=list-item \
            --disable-error-code=annotation-unchecked
```
