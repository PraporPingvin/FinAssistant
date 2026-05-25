# FinAssistant / FinRoad

Веб-платформа для постановки и контроля финансовых целей с прогнозом достижения.

## Стек
Frontend: React, Vite, React Router
Backend: Node.js, Express
Database: PostgreSQL
Auth: JWT, bcrypt

## Возможности
- регистрация и авторизация;
- создание финансовых целей;
- внесение платежей;
- контроль прогресса;
- сценарное моделирование;
- контрольные точки;
- прогнозирование достижения цели;
- графики накоплений.

## Запуск проекта

1. Установить зависимости:
npm run install-all

2. Запустить PostgreSQL:
docker-compose up -d postgres

3. Выполнить миграции:
cd server
npm run setup-db

4. Запустить backend:
npm run dev

5. Запустить frontend:
cd client
npm run dev
