-- Таблица пользователей
CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Таблица финансовых целей
CREATE TABLE goals (
    goal_id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    target_amount DECIMAL(15,2) NOT NULL,
    current_amount DECIMAL(15,2) DEFAULT 0,
    initial_amount DECIMAL(15,2) DEFAULT 0,
    monthly_contribution DECIMAL(15,2) NOT NULL,
    start_date DATE NOT NULL,
    deadline_date DATE,
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CHECK (status IN ('active', 'completed', 'paused'))
);

-- Таблица сценариев
CREATE TABLE scenarios (
    scenario_id SERIAL PRIMARY KEY,
    goal_id INTEGER REFERENCES goals(goal_id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    monthly_contribution DECIMAL(15,2) NOT NULL,
    expected_return DECIMAL(5,2) NOT NULL, -- процент
    inflation_rate DECIMAL(5,2) NOT NULL, -- процент
    target_amount DECIMAL(15,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(goal_id, name)
);

-- Таблица платежей
CREATE TABLE payments (
    payment_id SERIAL PRIMARY KEY,
    goal_id INTEGER REFERENCES goals(goal_id) ON DELETE CASCADE,
    amount DECIMAL(15,2) NOT NULL,
    payment_date DATE NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Таблица прогнозов
CREATE TABLE forecasts (
    forecast_id SERIAL PRIMARY KEY,
    goal_id INTEGER REFERENCES goals(goal_id) ON DELETE CASCADE,
    scenario_id INTEGER REFERENCES scenarios(scenario_id),
    forecast_date DATE NOT NULL,
    predicted_finish_date DATE NOT NULL,
    remaining_months INTEGER NOT NULL,
    current_amount DECIMAL(15,2) NOT NULL,
    target_amount DECIMAL(15,2) NOT NULL,
    final_amount DECIMAL(15,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Таблица контрольных точек
-- CREATE TABLE checkpoints (
--     checkpoint_id SERIAL PRIMARY KEY,
--     goal_id INTEGER REFERENCES goals(goal_id) ON DELETE CASCADE,
--     checkpoint_date DATE NOT NULL,
--     expected_amount DECIMAL(15,2) NOT NULL,
--     actual_amount DECIMAL(15,2),
--     status VARCHAR(50) DEFAULT 'pending',
--     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
-- );

/*
DROP TABLE IF EXISTS checkpoints CASCADE;
*/

CREATE TABLE checkpoints (
    checkpoint_id SERIAL PRIMARY KEY,
    goal_id INTEGER REFERENCES goals(goal_id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    expected_amount DECIMAL(15,2),
    target_amount DECIMAL(15,2),
    checkpoint_date DATE,
    target_date DATE,
    description TEXT,
    priority VARCHAR(50) DEFAULT 'medium',
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CHECK (status IN ('pending', 'completed', 'cancelled', 'overdue')),
    CHECK (priority IN ('high', 'medium', 'low'))
);


-- Индексы для улучшения производительности
CREATE INDEX idx_goals_user_id ON goals(user_id);
CREATE INDEX idx_scenarios_goal_id ON scenarios(goal_id);
CREATE INDEX idx_payments_goal_id ON payments(goal_id);
CREATE INDEX idx_forecasts_goal_id ON forecasts(goal_id);
CREATE INDEX idx_checkpoints_goal_id ON checkpoints(goal_id);

-- Тестовые данные (опционально)
INSERT INTO users (email, password_hash, first_name, last_name) 
VALUES ('demo@example.com', 'hashed_password', 'Иван', 'Иванов');

INSERT INTO goals (user_id, title, target_amount, current_amount, initial_amount, monthly_contribution, start_date, status)
VALUES 
(1, 'Накопить на машину', 1000000, 250000, 100000, 15000, '2024-01-01', 'active'),
(1, 'Отпуск на Бали', 300000, 120000, 50000, 10000, '2024-02-01', 'active');

COMMIT;