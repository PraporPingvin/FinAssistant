// server/database/seed.js
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
require('dotenv').config();

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'finroad_db',
    user: process.env.DB_USER || 'finroad_user',
    password: process.env.DB_PASSWORD || 'secure_password123',
});

async function seedDatabase() {
    try {
        console.log('🌱 Начало заполнения базы данных тестовыми данными...\n');

        // 1. Очистка таблиц (опционально)
        console.log('🧹 Очищаем таблицы...');
        await pool.query('TRUNCATE TABLE users, goals, scenarios, payments, forecasts, checkpoints RESTART IDENTITY CASCADE');
        console.log('✅ Таблицы очищены\n');

        // 2. Создание тестового пользователя с правильным bcrypt-хэшем
        console.log('👤 Создаём тестового пользователя...');
        const plainPassword = '123456';
        const hashedPassword = await bcrypt.hash(plainPassword, 10);
        
        const userResult = await pool.query(
            `INSERT INTO users (email, password_hash, first_name, last_name, created_at) 
             VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP) 
             RETURNING user_id, email, first_name, last_name`,
            ['demo@example.com', hashedPassword, 'Тестовый', 'Пользователь']
        );
        
        const userId = userResult.rows[0].user_id;
        console.log(`✅ Создан пользователь: ${userResult.rows[0].email}`);
        console.log(`   Пароль: ${plainPassword}\n`);

        // 3. Создание тестовых целей
        console.log('🎯 Создаём тестовые цели...');
        
        const goals = [
            {
                title: 'Накопить на машину',
                target_amount: 1000000,
                monthly_contribution: 15000,
                start_date: '2024-01-01',
                initial_amount: 100000
            },
            {
                title: 'Отпуск на Бали',
                target_amount: 300000,
                monthly_contribution: 10000,
                start_date: '2024-02-01',
                initial_amount: 50000
            },
            {
                title: 'Подушка безопасности',
                target_amount: 500000,
                monthly_contribution: 20000,
                start_date: '2024-03-01',
                initial_amount: 50000
            }
        ];
        
        for (const goalData of goals) {
            const goalResult = await pool.query(
                `INSERT INTO goals 
                 (user_id, title, target_amount, current_amount, 
                  initial_amount, monthly_contribution, start_date, status)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                 RETURNING goal_id, title`,
                [
                    userId,
                    goalData.title,
                    goalData.target_amount,
                    goalData.initial_amount,
                    goalData.initial_amount,
                    goalData.monthly_contribution,
                    goalData.start_date,
                    'active'
                ]
            );
            
            const goalId = goalResult.rows[0].goal_id;
            console.log(`   ✅ "${goalData.title}" (ID: ${goalId})`);
            
            // 4. Добавление сценариев для цели
            const scenarios = [
                {
                    name: 'Консервативный',
                    monthly_contribution: goalData.monthly_contribution,
                    expected_return: 4.0,
                    inflation_rate: 7.0
                },
                {
                    name: 'Умеренный',
                    monthly_contribution: Math.round(goalData.monthly_contribution * 1.2),
                    expected_return: 8.0,
                    inflation_rate: 7.0
                },
                {
                    name: 'Агрессивный',
                    monthly_contribution: Math.round(goalData.monthly_contribution * 1.5),
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
            
            // 5. Добавление тестовых платежей (3 месяца)
            for (let i = 1; i <= 3; i++) {
                const paymentDate = new Date(2024, i, 15);
                await pool.query(
                    `INSERT INTO payments (goal_id, amount, payment_date, description)
                     VALUES ($1, $2, $3, $4)`,
                    [
                        goalId,
                        goalData.monthly_contribution + (i * 1000),
                        paymentDate.toISOString().split('T')[0],
                        `Ежемесячный взнос #${i}`
                    ]
                );
            }
        }
        
        console.log('\n✅ Тестовые цели и сценарии созданы');

        // 6. Проверка результатов
        console.log('\n🔍 Итоги заполнения:');
        const stats = await pool.query(`
            SELECT 
                (SELECT COUNT(*) FROM users) as users_count,
                (SELECT COUNT(*) FROM goals) as goals_count,
                (SELECT COUNT(*) FROM scenarios) as scenarios_count,
                (SELECT COUNT(*) FROM payments) as payments_count,
                (SELECT COUNT(*) FROM checkpoints) as checkpoints_count
        `);
        
        console.log(`   👥 Пользователей: ${stats.rows[0].users_count}`);
        console.log(`   🎯 Целей: ${stats.rows[0].goals_count}`);
        console.log(`   📈 Сценариев: ${stats.rows[0].scenarios_count}`);
        console.log(`   💳 Платежей: ${stats.rows[0].payments_count}`);
        console.log(`   📌 Контрольных точек: ${stats.rows[0].checkpoints_count}`);
        
        console.log('\n✅ База данных успешно заполнена тестовыми данными!');
        console.log('\n📝 Для входа в приложение используйте:');
        console.log('   Email: demo@example.com');
        console.log('   Пароль: 123456\n');
        
    } catch (error) {
        console.error('❌ Ошибка заполнения базы данных:', error.message);
        console.error('Детали:', error);
    } finally {
        await pool.end();
    }
}

// Запуск
seedDatabase();