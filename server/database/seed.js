const { Pool } = require('pg');
require('dotenv').config();

async function createTablesIfNotExist(pool) {
  console.log('🔧 Проверяем и создаем таблицы если нужно...');
  
  const createTablesSQL = `
    -- Таблица пользователей
    CREATE TABLE IF NOT EXISTS users (
        user_id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        first_name VARCHAR(100),
        last_name VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Таблица финансовых целей
    CREATE TABLE IF NOT EXISTS goals (
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
    CREATE TABLE IF NOT EXISTS scenarios (
        scenario_id SERIAL PRIMARY KEY,
        goal_id INTEGER REFERENCES goals(goal_id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        monthly_contribution DECIMAL(15,2) NOT NULL,
        expected_return DECIMAL(5,2) NOT NULL,
        inflation_rate DECIMAL(5,2) NOT NULL,
        target_amount DECIMAL(15,2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(goal_id, name)
    );

    -- Таблица платежей
    CREATE TABLE IF NOT EXISTS payments (
        payment_id SERIAL PRIMARY KEY,
        goal_id INTEGER REFERENCES goals(goal_id) ON DELETE CASCADE,
        amount DECIMAL(15,2) NOT NULL,
        payment_date DATE NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Таблица прогнозов
    CREATE TABLE IF NOT EXISTS forecasts (
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
  `;

  await pool.query(createTablesSQL);
  
  // Создаем индексы
  const createIndexesSQL = `
    CREATE INDEX IF NOT EXISTS idx_goals_user_id ON goals(user_id);
    CREATE INDEX IF NOT EXISTS idx_scenarios_goal_id ON scenarios(goal_id);
    CREATE INDEX IF NOT EXISTS idx_payments_goal_id ON payments(goal_id);
    CREATE INDEX IF NOT EXISTS idx_forecasts_goal_id ON forecasts(goal_id);
    CREATE INDEX IF NOT EXISTS idx_checkpoints_goal_id ON checkpoints(goal_id);
  `;
  
  await pool.query(createIndexesSQL);
  console.log('✅ Таблицы созданы/проверены');
}

async function seedDatabase() {
    const pool = new Pool({
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        database: process.env.DB_NAME || 'finroad_db',
        user: process.env.DB_USER || 'finroad_user',
        password: process.env.DB_PASSWORD || 'secure_password123',
    });

    try {
        console.log('🌱 Начало заполнения базы данных...');
        
        // 1. Сначала создаем таблицы если их нет
        await createTablesIfNotExist(pool);
        
        // 2. Очистка таблиц (если нужно)
        console.log('🧹 Очищаем таблицы...');
        await pool.query('TRUNCATE TABLE users, goals, scenarios, payments, forecasts, checkpoints RESTART IDENTITY CASCADE');
        
        // 3. Добавление тестового пользователя
        console.log('👤 Создаем тестового пользователя...');
        const userResult = await pool.query(
            `INSERT INTO users (email, password_hash, first_name, last_name) 
             VALUES ($1, $2, $3, $4) RETURNING user_id`,
            ['demo@example.com', 'hashed_password', 'Иван', 'Иванов']
        );
        
        const userId = userResult.rows[0].user_id;
        console.log(`✅ Создан пользователь с ID: ${userId}`);
        
        // 4. Добавление тестовых целей
        console.log('🎯 Создаем цели...');
        const goals = [
            {
                title: 'Накопить на машину',
                target_amount: 1000000,
                monthly_contribution: 15000,
                start_date: '2024-01-01'
            },
            {
                title: 'Отпуск на Бали',
                target_amount: 300000,
                monthly_contribution: 10000,
                start_date: '2024-02-01'
            }
        ];
        
        for (const goalData of goals) {
            const goalResult = await pool.query(
                `INSERT INTO goals 
                 (user_id, title, target_amount, current_amount, 
                  initial_amount, monthly_contribution, start_date, status)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                 RETURNING goal_id`,
                [
                    userId,
                    goalData.title,
                    goalData.target_amount,
                    goalData.target_amount * 0.25, // 25% уже накоплено
                    50000,
                    goalData.monthly_contribution,
                    goalData.start_date,
                    'active'
                ]
            );
            
            const goalId = goalResult.rows[0].goal_id;
            console.log(`✅ Создана цель "${goalData.title}" с ID: ${goalId}`);
            
            // 5. Добавление сценариев для цели
            console.log(`📈 Добавляем сценарии для цели ${goalId}...`);
            const scenarios = [
                {
                    name: 'Консервативный',
                    monthly_contribution: goalData.monthly_contribution,
                    expected_return: 5.0,
                    inflation_rate: 7.0
                },
                {
                    name: 'Агрессивный',
                    monthly_contribution: goalData.monthly_contribution * 1.3,
                    expected_return: 12.0,
                    inflation_rate: 7.0
                }
            ];
            
            for (const scenarioData of scenarios) {
                await pool.query(
                    `INSERT INTO scenarios 
                     (goal_id, name, monthly_contribution, expected_return, inflation_rate, target_amount)
                     VALUES ($1, $2, $3, $4, $5, $6)`,
                    [
                        goalId,
                        scenarioData.name,
                        scenarioData.monthly_contribution,
                        scenarioData.expected_return,
                        scenarioData.inflation_rate,
                        goalData.target_amount
                    ]
                );
            }
            console.log(`✅ Добавлены сценарии для цели ID: ${goalId}`);
            
            // 6. Добавление тестовых платежей
            console.log(`💳 Добавляем платежи для цели ${goalId}...`);
            for (let i = 1; i <= 3; i++) {
                const paymentDate = new Date(2024, 2 - i, 1);
                await pool.query(
                    `INSERT INTO payments (goal_id, amount, payment_date, description)
                     VALUES ($1, $2, $3, $4)`,
                    [
                        goalId,
                        goalData.monthly_contribution,
                        paymentDate.toISOString().split('T')[0],
                        `Ежемесячный взнос #${i}`
                    ]
                );
            }
            console.log(`✅ Добавлены платежи для цели ID: ${goalId}`);
        }
        
        console.log('\n✅ База данных успешно заполнена!');
        
        // 7. Проверка результатов
        console.log('\n🔍 Проверка результатов:');
        const usersCount = await pool.query('SELECT COUNT(*) FROM users');
        const goalsCount = await pool.query('SELECT COUNT(*) FROM goals');
        const scenariosCount = await pool.query('SELECT COUNT(*) FROM scenarios');
        const paymentsCount = await pool.query('SELECT COUNT(*) FROM payments');
        
        console.log(`   👥 Пользователей: ${usersCount.rows[0].count}`);
        console.log(`   🎯 Целей: ${goalsCount.rows[0].count}`);
        console.log(`   📈 Сценариев: ${scenariosCount.rows[0].count}`);
        console.log(`   💳 Платежей: ${paymentsCount.rows[0].count}`);
        
    } catch (error) {
        console.error('❌ Ошибка заполнения базы данных:', error.message);
        console.error('Детали ошибки:', error);
    } finally {
        await pool.end();
    }
}

seedDatabase();