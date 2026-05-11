const { Pool } = require('pg');
require('dotenv').config();

async function createTables() {
  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'finroad_db',
    user: process.env.DB_USER || 'finroad_user',
    password: process.env.DB_PASSWORD || 'secure_password123',
  });

  try {
    console.log('🚀 Создание таблиц...');

    const sql = `
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

      -- Индексы
      CREATE INDEX IF NOT EXISTS idx_goals_user_id ON goals(user_id);
      CREATE INDEX IF NOT EXISTS idx_scenarios_goal_id ON scenarios(goal_id);
      CREATE INDEX IF NOT EXISTS idx_payments_goal_id ON payments(goal_id);
      CREATE INDEX IF NOT EXISTS idx_forecasts_goal_id ON forecasts(goal_id);
      CREATE INDEX IF NOT EXISTS idx_checkpoints_goal_id ON checkpoints(goal_id);
    `;

    // Выполняем SQL построчно для лучшего контроля
    const statements = sql.split(';').filter(stmt => stmt.trim().length > 0);

    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      if (stmt.trim()) {
        console.log(`📝 Выполняем: ${stmt.substring(0, 50)}...`);
        try {
          await pool.query(stmt);
          console.log(`✅ Команда ${i + 1} выполнена`);
        } catch (error) {
          console.log(`⚠️ Предупреждение: ${error.message}`);
        }
      }
    }

    console.log('\n✅ Таблицы созданы!');

    // Проверяем созданные таблицы
    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);

    console.log('📊 Создано таблиц:', result.rows.length);
    result.rows.forEach(row => console.log(`  • ${row.table_name}`));

  } catch (error) {
    console.error('❌ Ошибка создания таблиц:', error);
  } finally {
    await pool.end();
  }
}

createTables();