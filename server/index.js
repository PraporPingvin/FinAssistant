// server/index.js - основные эндпоинты
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto'); // Добавлено для генерации токенов
require('dotenv').config();

// const authRoutes = require('./routes/auth'); // Закомментировано, используем прямые маршруты

const app = express();

// Настройка CORS - важно для работы с фронтендом
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Логирование всех запросов для отладки
app.use((req, res, next) => {
  console.log(`\n📨 ${req.method} ${req.url}`);
  if (req.body && Object.keys(req.body).length > 0) {
    console.log('📦 Body:', req.body);
  }
  next();
});

// Конфигурация
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';
const PORT = process.env.PORT || 5000;

// Подключение к базе данных
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'finroad_db',
  user: process.env.DB_USER || 'finroad_user',
  password: process.env.DB_PASSWORD || 'secure_password123',
});

// Сохраняем pool в app.locals для доступа в других модулях
app.locals.pool = pool;

// Временное хранилище для токенов сброса пароля (в реальном приложении используйте БД)
const resetTokens = new Map();

// ============ МИДЛВАРЫ ============

// Мидлвар для проверки JWT токена
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Требуется авторизация' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Недействительный или просроченный токен' });
    }
    req.user = user;
    next();
  });
};

// Мидлвар для проверки владельца цели
const checkGoalOwnership = async (req, res, next) => {
  try {
    const goalId = req.params.goalId || req.body.goal_id;
    if (!goalId) {
      return next();
    }

    const result = await pool.query(
      'SELECT user_id FROM goals WHERE goal_id = $1',
      [goalId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Цель не найдена' });
    }

    if (result.rows[0].user_id !== req.user.userId) {
      return res.status(403).json({ error: 'Доступ запрещен' });
    }

    next();
  } catch (error) {
    console.error('Ошибка проверки владельца:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
};

// ============ АУТЕНТИФИКАЦИЯ ============

// Эндпоинт для проверки здоровья
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Сервер работает',
    timestamp: new Date().toISOString()
  });
});

// Тестовый эндпоинт
app.get('/api/test', (req, res) => {
  res.json({
    message: 'Сервер работает!',
    timestamp: new Date().toISOString(),
    endpoints: [
      '/api/health',
      '/api/auth/register',
      '/api/auth/login',
      '/api/auth/verify',
      '/api/auth/forgot-password',
      '/api/auth/reset-password'
    ]
  });
});

// Регистрация
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, first_name, last_name } = req.body;

    console.log('📝 Попытка регистрации:', { email, first_name, last_name });

    // Валидация
    if (!email || !password) {
      return res.status(400).json({ error: 'Email и пароль обязательны' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Пароль должен быть не менее 6 символов' });
    }

    // Проверяем, существует ли пользователь
    const userExists = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    if (userExists.rows.length > 0) {
      return res.status(400).json({ error: 'Пользователь с таким email уже существует' });
    }

    // Хешируем пароль
    const hashedPassword = await bcrypt.hash(password, 10);

    // Создаем пользователя
    const result = await pool.query(
      `INSERT INTO users (email, password_hash, first_name, last_name, created_at, updated_at)
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING user_id, email, first_name, last_name, created_at`,
      [email, hashedPassword, first_name || null, last_name || null]
    );

    const user = result.rows[0];

    // Создаем JWT токен
    const token = jwt.sign(
      { userId: user.user_id, email: user.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    console.log('🎉 Регистрация успешно завершена для:', user.email);

    res.status(201).json({
      message: 'Регистрация успешна',
      token,
      user: {
        id: user.user_id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name
      }
    });

  } catch (error) {
    console.error('❌ Ошибка регистрации:', error);
    res.status(500).json({
      error: 'Ошибка сервера при регистрации'
    });
  }
});

// Вход
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log('📝 Попытка входа:', email);

    if (!email || !password) {
      return res.status(400).json({ error: 'Email и пароль обязательны' });
    }

    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    const user = result.rows[0];

    if (!user) {
      return res.status(401).json({ error: 'Неверный email или пароль' });
    }

    const validPassword = await bcrypt.compare(password, user.password_hash);

    if (!validPassword) {
      return res.status(401).json({ error: 'Неверный email или пароль' });
    }

    const token = jwt.sign(
      { userId: user.user_id, email: user.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    console.log('🎉 Вход выполнен для:', user.email);

    res.json({
      message: 'Вход выполнен успешно',
      token,
      user: {
        id: user.user_id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name
      }
    });

  } catch (error) {
    console.error('❌ Ошибка входа:', error);
    res.status(500).json({ error: 'Ошибка сервера при входе' });
  }
});

// Проверка токена
app.get('/api/auth/verify', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Токен не предоставлен' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);

    const result = await pool.query(
      'SELECT user_id, email, first_name, last_name FROM users WHERE user_id = $1',
      [decoded.userId]
    );

    const user = result.rows[0];

    if (!user) {
      return res.status(401).json({ error: 'Пользователь не найден' });
    }

    res.json({
      user: {
        id: user.user_id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name
      }
    });

  } catch (error) {
    console.error('❌ Ошибка проверки токена:', error);
    res.status(401).json({ error: 'Недействительный токен' });
  }
});

// ============ ВОССТАНОВЛЕНИЕ ПАРОЛЯ ============

// Запрос на сброс пароля
// app.post('/api/auth/forgot-password', async (req, res) => {
//   try {
//     const { email } = req.body;

//     console.log('📝 Запрос на сброс пароля для:', email);

//     if (!email) {
//       return res.status(400).json({ error: 'Email обязателен' });
//     }

//     // Проверяем, существует ли пользователь
//     const userResult = await pool.query(
//       'SELECT user_id, email FROM users WHERE email = $1',
//       [email]
//     );

//     // Для безопасности не сообщаем, существует пользователь или нет
//     if (userResult.rows.length === 0) {
//       console.log('ℹ️ Пользователь не найден, но отправляем успешный ответ');
//       return res.json({ 
//         message: 'Если пользователь с таким email существует, инструкция по восстановлению пароля будет отправлена' 
//       });
//     }

//     const user = userResult.rows[0];

//     // Генерируем уникальный токен
//     const token = crypto.randomBytes(32).toString('hex');
//     const expiresAt = Date.now() + 3600000; // 1 час

//     // Сохраняем токен
//     resetTokens.set(token, {
//       userId: user.user_id,
//       email: user.email,
//       expiresAt
//     });

//     // В реальном приложении здесь отправка email
//     console.log(`🔐 Токен для сброса пароля: ${token}`);
//     console.log(`🔗 Ссылка для сброса: http://localhost:5173/reset-password?token=${token}`);

//     res.json({ 
//       message: 'Инструкция по восстановлению пароля отправлена на ваш email',
//       // В демо-режиме возвращаем токен для тестирования
//       devToken: token,
//       resetLink: `http://localhost:5173/reset-password?token=${token}`
//     });

//   } catch (error) {
//     console.error('❌ Ошибка при запросе сброса пароля:', error);
//     res.status(500).json({ error: 'Ошибка сервера' });
//   }
// });

// // Сброс пароля с токеном
// app.post('/api/auth/reset-password', async (req, res) => {
//   try {
//     const { token, newPassword } = req.body;

//     console.log('📝 Попытка сброса пароля с токеном');

//     if (!token || !newPassword) {
//       return res.status(400).json({ error: 'Токен и новый пароль обязательны' });
//     }

//     if (newPassword.length < 6) {
//       return res.status(400).json({ error: 'Пароль должен быть не менее 6 символов' });
//     }

//     // Проверяем токен
//     const resetData = resetTokens.get(token);

//     if (!resetData) {
//       return res.status(400).json({ error: 'Недействительный или устаревший токен' });
//     }

//     if (Date.now() > resetData.expiresAt) {
//       resetTokens.delete(token);
//       return res.status(400).json({ error: 'Срок действия токена истек' });
//     }

//     // Хешируем новый пароль
//     const hashedPassword = await bcrypt.hash(newPassword, 10);

//     // Обновляем пароль в базе
//     await pool.query(
//       'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2',
//       [hashedPassword, resetData.userId]
//     );

//     // Удаляем использованный токен
//     resetTokens.delete(token);

//     console.log('✅ Пароль успешно изменен для пользователя:', resetData.email);

//     res.json({ 
//       message: 'Пароль успешно изменен. Теперь вы можете войти с новым паролем.' 
//     });

//   } catch (error) {
//     console.error('❌ Ошибка при сбросе пароля:', error);
//     res.status(500).json({ error: 'Ошибка сервера' });
//   }
// });
// Добавьте этот эндпоинт в server/index.js после других auth эндпоинтов

// Простой сброс пароля (без токенов и кодов)
app.post('/api/auth/simple-reset-password', async (req, res) => {
  try {
    const { email, newPassword } = req.body;

    console.log('📝 [simple-reset] Запрос для:', email);

    if (!email || !newPassword) {
      return res.status(400).json({ error: 'Email и новый пароль обязательны' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Пароль должен быть не менее 6 символов' });
    }

    const userResult = await pool.query(
      'SELECT user_id FROM users WHERE email = $1',
      [email]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'Пользователь с таким email не найден' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await pool.query(
      'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE email = $2',
      [hashedPassword, email]
    );

    console.log('✅ Пароль изменен для:', email);

    res.json({
      success: true,
      message: 'Пароль успешно изменен!'
    });

  } catch (error) {
    console.error('❌ Ошибка:', error);
    res.status(500).json({ error: 'Ошибка сервера: ' + error.message });
  }
});

// ============ ЭНДПОИНТЫ ДЛЯ ЦЕЛЕЙ ============

// Получить все цели текущего пользователя
app.get('/api/goals', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const result = await pool.query(
      'SELECT * FROM goals WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Ошибка получения целей:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Получить конкретную цель
app.get('/api/goals/:goalId', authenticateToken, checkGoalOwnership, async (req, res) => {
  try {
    const { goalId } = req.params;
    const result = await pool.query(
      'SELECT * FROM goals WHERE goal_id = $1',
      [goalId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Цель не найдена' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Ошибка получения цели:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Создать новую цель
app.post('/api/goals', authenticateToken, async (req, res) => {
  try {
    const {
      title,
      target_amount,
      monthly_contribution,
      start_date,
      deadline_date,
      initial_amount = 0,
      status = 'active'
    } = req.body;

    const userId = req.user.userId;

    // Проверка обязательных полей
    if (!title || !target_amount || !monthly_contribution || !start_date) {
      return res.status(400).json({ error: 'Не все обязательные поля заполнены' });
    }

    const result = await pool.query(
      `INSERT INTO goals 
       (user_id, title, target_amount, monthly_contribution, start_date, deadline_date, initial_amount, status, current_amount)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [userId, title, target_amount, monthly_contribution, start_date, deadline_date, initial_amount, status, initial_amount]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Ошибка создания цели:', error);
    res.status(500).json({ error: 'Ошибка создания цели' });
  }
});

// Обновить цель
app.patch('/api/goals/:goalId', authenticateToken, checkGoalOwnership, async (req, res) => {
  try {
    const { goalId } = req.params;
    const updates = req.body;

    console.log(`📝 Обновление цели ID: ${goalId}`, updates);

    // Проверяем обязательные поля если они есть в updates
    if (updates.target_amount !== undefined && updates.target_amount <= 0) {
      return res.status(400).json({ error: 'Целевая сумма должна быть больше 0' });
    }

    if (updates.monthly_contribution !== undefined && updates.monthly_contribution <= 0) {
      return res.status(400).json({ error: 'Ежемесячный взнос должен быть больше 0' });
    }

    if (updates.current_amount !== undefined && updates.current_amount < 0) {
      return res.status(400).json({ error: 'Текущая сумма не может быть отрицательной' });
    }

    // Обновляем только определенные поля если они есть
    let query = 'UPDATE goals SET updated_at = CURRENT_TIMESTAMP';
    const values = [];
    let paramIndex = 1;

    const fields = ['title', 'target_amount', 'monthly_contribution', 'current_amount',
      'initial_amount', 'start_date', 'deadline_date', 'status'];

    fields.forEach(field => {
      if (updates[field] !== undefined) {
        query += `, ${field} = $${paramIndex}`;
        values.push(updates[field]);
        paramIndex++;
      }
    });

    if (paramIndex === 1) {
      return res.status(400).json({ error: 'Нет полей для обновления' });
    }

    query += ` WHERE goal_id = $${paramIndex} RETURNING *`;
    values.push(goalId);

    const result = await pool.query(query, values);

    console.log('✅ Цель обновлена:', result.rows[0]);
    res.json(result.rows[0]);

  } catch (error) {
    console.error('❌ Ошибка обновления цели:', error);
    res.status(500).json({ error: 'Ошибка обновления цели' });
  }
});

// Удалить цель
app.delete('/api/goals/:goalId', authenticateToken, checkGoalOwnership, async (req, res) => {
  try {
    const { goalId } = req.params;

    const result = await pool.query(
      'DELETE FROM goals WHERE goal_id = $1 RETURNING *',
      [goalId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Цель не найдена' });
    }

    res.json({ message: 'Цель успешно удалена', deletedGoal: result.rows[0] });
  } catch (error) {
    console.error('Ошибка удаления цели:', error);
    res.status(500).json({ error: 'Ошибка удаления цели' });
  }
});

// ============ ЭНДПОИНТЫ ДЛЯ СЦЕНАРИЕВ ============

// Получить сценарии для цели
app.get('/api/scenarios/:goalId', authenticateToken, checkGoalOwnership, async (req, res) => {
  try {
    const { goalId } = req.params;
    const result = await pool.query(
      'SELECT * FROM scenarios WHERE goal_id = $1 ORDER BY created_at DESC',
      [goalId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Ошибка получения сценариев:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Получить сценарий по ID
app.get('/api/scenarios/scenario/:scenarioId', authenticateToken, async (req, res) => {
  try {
    const { scenarioId } = req.params;

    // Проверяем доступ к сценарию через цель
    const scenarioCheck = await pool.query(
      `SELECT s.*, g.user_id 
       FROM scenarios s
       JOIN goals g ON s.goal_id = g.goal_id
       WHERE s.scenario_id = $1`,
      [scenarioId]
    );

    if (scenarioCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Сценарий не найден' });
    }

    if (scenarioCheck.rows[0].user_id !== req.user.userId) {
      return res.status(403).json({ error: 'Доступ запрещен' });
    }

    res.json(scenarioCheck.rows[0]);
  } catch (error) {
    console.error('Ошибка получения сценария:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Создать сценарий
app.post('/api/scenarios', authenticateToken, async (req, res) => {
  try {
    const {
      goal_id,
      name,
      monthly_contribution,
      expected_return,
      inflation_rate,
      target_amount
    } = req.body;

    // Проверяем доступ к цели
    const goalCheck = await pool.query(
      'SELECT user_id FROM goals WHERE goal_id = $1',
      [goal_id]
    );

    if (goalCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Цель не найдена' });
    }

    if (goalCheck.rows[0].user_id !== req.user.userId) {
      return res.status(403).json({ error: 'Доступ запрещен' });
    }

    // Проверка обязательных полей
    if (!goal_id || !name || !monthly_contribution || !expected_return || !inflation_rate || !target_amount) {
      return res.status(400).json({ error: 'Не все обязательные поля заполнены' });
    }

    const result = await pool.query(
      `INSERT INTO scenarios 
       (goal_id, name, monthly_contribution, expected_return, inflation_rate, target_amount)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [goal_id, name, monthly_contribution, expected_return, inflation_rate, target_amount]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Ошибка создания сценария:', error);
    res.status(500).json({ error: 'Ошибка создания сценария' });
  }
});

// Обновить сценарий
app.patch('/api/scenarios/:scenarioId', authenticateToken, async (req, res) => {
  try {
    const { scenarioId } = req.params;
    const updates = req.body;

    console.log(`📝 Обновление сценария ID: ${scenarioId}`, updates);

    // Проверяем доступ к сценарию
    const scenarioCheck = await pool.query(
      `SELECT s.*, g.user_id 
       FROM scenarios s
       JOIN goals g ON s.goal_id = g.goal_id
       WHERE s.scenario_id = $1`,
      [scenarioId]
    );

    if (scenarioCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Сценарий не найден' });
    }

    if (scenarioCheck.rows[0].user_id !== req.user.userId) {
      return res.status(403).json({ error: 'Доступ запрещен' });
    }

    // Проверяем обязательные поля
    if (updates.monthly_contribution !== undefined && updates.monthly_contribution <= 0) {
      return res.status(400).json({ error: 'Ежемесячный взнос должен быть больше 0' });
    }

    if (updates.expected_return !== undefined && updates.expected_return < 0) {
      return res.status(400).json({ error: 'Доходность не может быть отрицательной' });
    }

    if (updates.inflation_rate !== undefined && updates.inflation_rate < 0) {
      return res.status(400).json({ error: 'Инфляция не может быть отрицательной' });
    }

    // Обновляем поля
    let query = 'UPDATE scenarios SET';
    const values = [];
    let paramIndex = 1;

    const fields = ['name', 'monthly_contribution', 'expected_return', 'inflation_rate', 'target_amount'];

    fields.forEach(field => {
      if (updates[field] !== undefined) {
        if (paramIndex > 1) query += ',';
        query += ` ${field} = $${paramIndex}`;
        values.push(updates[field]);
        paramIndex++;
      }
    });

    if (paramIndex === 1) {
      return res.status(400).json({ error: 'Нет полей для обновления' });
    }

    query += ` WHERE scenario_id = $${paramIndex} RETURNING *`;
    values.push(scenarioId);

    const result = await pool.query(query, values);

    console.log('✅ Сценарий обновлен:', result.rows[0]);
    res.json(result.rows[0]);

  } catch (error) {
    console.error('❌ Ошибка обновления сценария:', error);
    res.status(500).json({ error: 'Ошибка обновления сценария' });
  }
});

// Удалить сценарий
app.delete('/api/scenarios/:scenarioId', authenticateToken, async (req, res) => {
  try {
    const { scenarioId } = req.params;

    // Проверяем доступ
    const scenarioCheck = await pool.query(
      `SELECT s.*, g.user_id 
       FROM scenarios s
       JOIN goals g ON s.goal_id = g.goal_id
       WHERE s.scenario_id = $1`,
      [scenarioId]
    );

    if (scenarioCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Сценарий не найден' });
    }

    if (scenarioCheck.rows[0].user_id !== req.user.userId) {
      return res.status(403).json({ error: 'Доступ запрещен' });
    }

    const result = await pool.query(
      'DELETE FROM scenarios WHERE scenario_id = $1 RETURNING *',
      [scenarioId]
    );

    res.json({
      success: true,
      message: 'Сценарий успешно удален',
      deletedScenario: result.rows[0]
    });
  } catch (error) {
    console.error('Ошибка удаления сценария:', error);
    res.status(500).json({ error: 'Ошибка удаления сценария' });
  }
});

// ============ ЭНДПОИНТЫ ДЛЯ ПЛАТЕЖЕЙ ============

// Получить платежи для цели
app.get('/api/payments/:goalId', authenticateToken, checkGoalOwnership, async (req, res) => {
  try {
    const { goalId } = req.params;
    const result = await pool.query(
      'SELECT * FROM payments WHERE goal_id = $1 ORDER BY payment_date DESC',
      [goalId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Ошибка получения платежей:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Добавить платеж
app.post('/api/payments', authenticateToken, async (req, res) => {
  try {
    const { goal_id, amount, payment_date, description } = req.body;

    // Проверяем доступ к цели
    const goalCheck = await pool.query(
      'SELECT user_id FROM goals WHERE goal_id = $1',
      [goal_id]
    );

    if (goalCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Цель не найдена' });
    }

    if (goalCheck.rows[0].user_id !== req.user.userId) {
      return res.status(403).json({ error: 'Доступ запрещен' });
    }

    // Проверка обязательных полей
    if (!goal_id || !amount || !payment_date) {
      return res.status(400).json({ error: 'Не все обязательные поля заполнены' });
    }

    const result = await pool.query(
      `INSERT INTO payments (goal_id, amount, payment_date, description)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [goal_id, amount, payment_date, description || '']
    );

    // Обновляем текущую сумму в цели
    await pool.query(
      'UPDATE goals SET current_amount = current_amount + $1, updated_at = CURRENT_TIMESTAMP WHERE goal_id = $2',
      [amount, goal_id]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Ошибка добавления платежа:', error);
    res.status(500).json({ error: 'Ошибка добавления платежа' });
  }
});

// ============ ЭНДПОИНТЫ ДЛЯ КОНТРОЛЬНЫХ ТОЧЕК ============

// Получить все контрольные точки пользователя
app.get('/api/checkpoints', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    console.log(`📋 Запрос контрольных точек для пользователя ${userId}`);

    // Получаем все цели пользователя
    const goalsResult = await pool.query(
      'SELECT goal_id FROM goals WHERE user_id = $1',
      [userId]
    );

    const goalIds = goalsResult.rows.map(g => g.goal_id);

    if (goalIds.length === 0) {
      return res.json([]);
    }

    // Получаем контрольные точки для всех целей пользователя
    const checkpointsResult = await pool.query(
      `SELECT 
         cp.*, 
         COALESCE(cp.target_amount, cp.expected_amount) as display_amount,
         g.title as goal_title, 
         g.target_amount as goal_target 
       FROM checkpoints cp
       JOIN goals g ON cp.goal_id = g.goal_id
       WHERE cp.goal_id = ANY($1::int[])
       ORDER BY 
         CASE cp.status
           WHEN 'pending' THEN 1
           WHEN 'overdue' THEN 2
           ELSE 3
         END,
         COALESCE(cp.target_date, cp.checkpoint_date) ASC NULLS LAST,
         cp.created_at DESC`,
      [goalIds]
    );

    console.log(`✅ Найдено контрольных точек: ${checkpointsResult.rows.length}`);
    res.json(checkpointsResult.rows);
  } catch (error) {
    console.error('❌ Ошибка получения контрольных точек:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Получить контрольные точки для конкретной цели
app.get('/api/checkpoints/goal/:goalId', authenticateToken, checkGoalOwnership, async (req, res) => {
  try {
    const { goalId } = req.params;

    const result = await pool.query(
      `SELECT * FROM checkpoints 
       WHERE goal_id = $1 
       ORDER BY 
         CASE status
           WHEN 'pending' THEN 1
           WHEN 'overdue' THEN 2
           ELSE 3
         END,
         target_date ASC NULLS LAST`,
      [goalId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Ошибка получения контрольных точек цели:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Создать контрольную точку
app.post('/api/checkpoints', authenticateToken, async (req, res) => {
  try {
    const {
      goal_id,
      title,
      target_amount,
      target_date,
      description,
      priority,
      status
    } = req.body;

    console.log('📝 Создание контрольной точки:', req.body);

    // Проверяем доступ к цели
    const goalCheck = await pool.query(
      'SELECT user_id FROM goals WHERE goal_id = $1',
      [goal_id]
    );

    if (goalCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Цель не найдена' });
    }

    if (goalCheck.rows[0].user_id !== req.user.userId) {
      return res.status(403).json({ error: 'Доступ запрещен' });
    }

    // Проверка обязательных полей
    if (!goal_id || !title || !target_amount) {
      return res.status(400).json({
        error: 'Не все обязательные поля заполнены',
        required: ['goal_id', 'title', 'target_amount']
      });
    }

    const result = await pool.query(
      `INSERT INTO checkpoints 
       (goal_id, title, expected_amount, target_amount, target_date, description, priority, status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)
       RETURNING *`,
      [
        goal_id,
        title,
        target_amount,
        target_amount,
        target_date || null,
        description || '',
        priority || 'medium',
        status || 'pending'
      ]
    );

    console.log('✅ Контрольная точка создана:', result.rows[0]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('❌ Ошибка создания контрольной точки:', error);
    res.status(500).json({ error: 'Ошибка создания контрольной точки' });
  }
});

// Обновить контрольную точку
app.patch('/api/checkpoints/:checkpointId', authenticateToken, async (req, res) => {
  try {
    const { checkpointId } = req.params;
    const updates = req.body;

    console.log(`📝 Обновление контрольной точки ${checkpointId}:`, updates);

    // Проверяем доступ
    const checkpointCheck = await pool.query(
      `SELECT cp.*, g.user_id 
       FROM checkpoints cp
       JOIN goals g ON cp.goal_id = g.goal_id
       WHERE cp.checkpoint_id = $1`,
      [checkpointId]
    );

    if (checkpointCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Контрольная точка не найдена' });
    }

    if (checkpointCheck.rows[0].user_id !== req.user.userId) {
      return res.status(403).json({ error: 'Доступ запрещен' });
    }

    // Строим динамический запрос
    let query = 'UPDATE checkpoints SET';
    const values = [];
    let paramIndex = 1;

    const allowedFields = ['title', 'target_amount', 'target_date', 'description', 'priority', 'status'];

    allowedFields.forEach(field => {
      if (updates[field] !== undefined) {
        if (paramIndex > 1) query += ',';
        query += ` ${field} = $${paramIndex}`;
        values.push(updates[field]);
        paramIndex++;
      }
    });

    if (paramIndex === 1) {
      return res.status(400).json({ error: 'Нет полей для обновления' });
    }

    query += ` WHERE checkpoint_id = $${paramIndex} RETURNING *`;
    values.push(checkpointId);

    const result = await pool.query(query, values);
    console.log('✅ Контрольная точка обновлена:', result.rows[0]);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('❌ Ошибка обновления контрольной точки:', error);
    res.status(500).json({ error: 'Ошибка обновления контрольной точки' });
  }
});

// Удалить контрольную точку
app.delete('/api/checkpoints/:checkpointId', authenticateToken, async (req, res) => {
  try {
    const { checkpointId } = req.params;
    console.log(`🗑️ Удаление контрольной точки ${checkpointId}`);

    // Проверяем доступ
    const checkpointCheck = await pool.query(
      `SELECT cp.*, g.user_id 
       FROM checkpoints cp
       JOIN goals g ON cp.goal_id = g.goal_id
       WHERE cp.checkpoint_id = $1`,
      [checkpointId]
    );

    if (checkpointCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Контрольная точка не найдена' });
    }

    if (checkpointCheck.rows[0].user_id !== req.user.userId) {
      return res.status(403).json({ error: 'Доступ запрещен' });
    }

    const result = await pool.query(
      'DELETE FROM checkpoints WHERE checkpoint_id = $1 RETURNING *',
      [checkpointId]
    );

    console.log('✅ Контрольная точка удалена:', result.rows[0]);
    res.json({ message: 'Контрольная точка успешно удалена', deleted: result.rows[0] });
  } catch (error) {
    console.error('❌ Ошибка удаления контрольной точки:', error);
    res.status(500).json({ error: 'Ошибка удаления контрольной точки' });
  }
});

// ============ ЭНДПОИНТЫ ДЛЯ ПРОГНОЗОВ ============

// Получить прогноз для цели
app.get('/api/forecast/:goalId', authenticateToken, checkGoalOwnership, async (req, res) => {
  try {
    const { goalId } = req.params;
    const result = await pool.query(
      `SELECT * FROM forecasts 
       WHERE goal_id = $1 
       ORDER BY created_at DESC 
       LIMIT 1`,
      [goalId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Прогноз не найден' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Ошибка получения прогноза:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Создать прогноз
app.post('/api/forecast', authenticateToken, async (req, res) => {
  try {
    const {
      goal_id,
      scenario_id,
      forecast_date,
      predicted_finish_date,
      remaining_months,
      current_amount,
      target_amount,
      final_amount
    } = req.body;

    // Проверяем доступ к цели
    const goalCheck = await pool.query(
      'SELECT user_id FROM goals WHERE goal_id = $1',
      [goal_id]
    );

    if (goalCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Цель не найдена' });
    }

    if (goalCheck.rows[0].user_id !== req.user.userId) {
      return res.status(403).json({ error: 'Доступ запрещен' });
    }

    const result = await pool.query(
      `INSERT INTO forecasts 
       (goal_id, scenario_id, forecast_date, predicted_finish_date, remaining_months, current_amount, target_amount, final_amount)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [goal_id, scenario_id, forecast_date, predicted_finish_date, remaining_months, current_amount, target_amount, final_amount]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Ошибка создания прогноза:', error);
    res.status(500).json({ error: 'Ошибка создания прогноза' });
  }
});

// ============ ВСПОМОГАТЕЛЬНЫЕ ЭНДПОИНТЫ ============

// Получить статистику пользователя
app.get('/api/user/stats', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    const stats = await pool.query(
      `SELECT 
         COUNT(DISTINCT g.goal_id) as total_goals,
         COUNT(DISTINCT s.scenario_id) as total_scenarios,
         COUNT(DISTINCT p.payment_id) as total_payments,
         SUM(p.amount) as total_saved,
         COUNT(DISTINCT cp.checkpoint_id) as total_checkpoints,
         SUM(CASE WHEN cp.status = 'completed' THEN 1 ELSE 0 END) as completed_checkpoints
       FROM users u
       LEFT JOIN goals g ON u.user_id = g.user_id
       LEFT JOIN scenarios s ON g.goal_id = s.goal_id
       LEFT JOIN payments p ON g.goal_id = p.goal_id
       LEFT JOIN checkpoints cp ON g.goal_id = cp.goal_id
       WHERE u.user_id = $1
       GROUP BY u.user_id`,
      [userId]
    );

    res.json(stats.rows[0] || { total_goals: 0, total_scenarios: 0, total_payments: 0, total_saved: 0, total_checkpoints: 0, completed_checkpoints: 0 });
  } catch (error) {
    console.error('Ошибка получения статистики:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// ============ ОБРАБОТКА ОШИБОК ============

// Обработка необработанных ошибок
process.on('uncaughtException', (err) => {
  console.error('❌ Необработанная ошибка:', err);
});

process.on('unhandledRejection', (err) => {
  console.error('❌ Необработанный reject:', err);
});


// ============ ЭНДПОИНТЫ ДЛЯ ПРОФИЛЯ И НАСТРОЕК ============

// Получить данные профиля
app.get('/api/user/profile', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    const result = await pool.query(
      'SELECT user_id, email, first_name, last_name, created_at FROM users WHERE user_id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('❌ Ошибка получения профиля:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Обновление профиля пользователя
app.patch('/api/user/profile', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { first_name, last_name } = req.body;

    console.log('📝 Обновление профиля для пользователя:', userId);
    console.log('📦 Данные:', { first_name, last_name });

    const result = await pool.query(
      `UPDATE users 
       SET first_name = $1, last_name = $2, updated_at = CURRENT_TIMESTAMP 
       WHERE user_id = $3 
       RETURNING user_id, email, first_name, last_name`,
      [first_name || null, last_name || null, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    console.log('✅ Профиль обновлен');
    res.json({ 
      success: true,
      user: result.rows[0]
    });
  } catch (error) {
    console.error('❌ Ошибка обновления профиля:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Смена пароля
app.post('/api/user/change-password', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { currentPassword, newPassword } = req.body;

    console.log('📝 Смена пароля для пользователя:', userId);

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Текущий и новый пароль обязательны' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Новый пароль должен быть не менее 6 символов' });
    }

    const userResult = await pool.query(
      'SELECT password_hash FROM users WHERE user_id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    const validPassword = await bcrypt.compare(currentPassword, userResult.rows[0].password_hash);
    
    if (!validPassword) {
      return res.status(401).json({ error: 'Неверный текущий пароль' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await pool.query(
      'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2',
      [hashedPassword, userId]
    );

    console.log('✅ Пароль успешно изменен');
    res.json({ message: 'Пароль успешно изменен' });
  } catch (error) {
    console.error('❌ Ошибка смены пароля:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// ============ ЗАПУСК СЕРВЕРА ============

app.listen(PORT, () => {
  console.log('\n' + '='.repeat(60));
  console.log(`🚀 Сервер запущен на порту ${PORT}`);
  console.log('='.repeat(60));
  console.log('\n📊 Доступные маршруты:');
  console.log('   🏥 GET  /api/health');
  console.log('   🔧 GET  /api/test');
  console.log('\n🔐 Аутентификация:');
  console.log('   📝 POST /api/auth/register');
  console.log('   🔑 POST /api/auth/login');
  console.log('   ✅ GET  /api/auth/verify');
  console.log('   📧 POST /api/auth/forgot-password');
  console.log('   🔄 POST /api/auth/reset-password');
  console.log('\n🎯 Цели:');
  console.log('   📋 GET    /api/goals');
  console.log('   🔍 GET    /api/goals/:goalId');
  console.log('   ✨ POST   /api/goals');
  console.log('   📝 PATCH  /api/goals/:goalId');
  console.log('   🗑️ DELETE /api/goals/:goalId');
  console.log('\n📈 Сценарии:');
  console.log('   📋 GET    /api/scenarios/:goalId');
  console.log('   🔍 GET    /api/scenarios/scenario/:scenarioId');
  console.log('   ✨ POST   /api/scenarios');
  console.log('   📝 PATCH  /api/scenarios/:scenarioId');
  console.log('   🗑️ DELETE /api/scenarios/:scenarioId');
  console.log('\n💳 Платежи:');
  console.log('   📋 GET    /api/payments/:goalId');
  console.log('   ✨ POST   /api/payments');
  console.log('\n📌 Контрольные точки:');
  console.log('   📋 GET    /api/checkpoints');
  console.log('   🎯 GET    /api/checkpoints/goal/:goalId');
  console.log('   ✨ POST   /api/checkpoints');
  console.log('   📝 PATCH  /api/checkpoints/:checkpointId');
  console.log('   🗑️ DELETE /api/checkpoints/:checkpointId');
  console.log('\n🔮 Прогнозы:');
  console.log('   🔍 GET    /api/forecast/:goalId');
  console.log('   ✨ POST   /api/forecast');
  console.log('\n📊 Статистика:');
  console.log('   📈 GET    /api/user/stats');
  console.log('\n' + '='.repeat(60) + '\n');
});