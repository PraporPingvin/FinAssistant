// ============================================================
// server/index.js - Основной сервер платформы FinRoad
// ============================================================

// ==================== ИМПОРТЫ ====================
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config();

// ==================== ИНИЦИАЛИЗАЦИЯ ====================
const app = express();

// ==================== КОНФИГУРАЦИЯ ====================
// Убираем дефолтные значения - только из переменных окружения
const JWT_SECRET = process.env.JWT_SECRET;
const PORT = process.env.PORT || 5000;

// Проверка наличия обязательных переменных окружения
if (!JWT_SECRET) {
  console.error('\n❌ ОШИБКА: JWT_SECRET не задан в переменных окружения!');
  console.error('Создайте файл .env на основе .env.example\n');
  process.exit(1);
}

if (!process.env.DB_HOST || !process.env.DB_NAME || !process.env.DB_USER || !process.env.DB_PASSWORD) {
  console.error('\n❌ ОШИБКА: Не все параметры БД заданы в переменных окружения!');
  console.error('Создайте файл .env на основе .env.example\n');
  process.exit(1);
}

// ==================== ПОДКЛЮЧЕНИЕ К БАЗЕ ДАННЫХ ====================
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

app.locals.pool = pool;

// ==================== НАСТРОЙКА CORS ====================
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// ==================== MIDDLEWARE ====================

// Парсинг JSON
app.use(express.json());

// Безопасное логирование запросов (маскируем пароли)
app.use((req, res, next) => {
  console.log(`\n📨 ${req.method} ${req.url}`);
  if (req.body && Object.keys(req.body).length > 0) {
    // Копируем тело запроса для безопасного логирования
    const safeBody = { ...req.body };
    
    // Маскируем поля с паролями
    const sensitiveFields = ['password', 'newPassword', 'currentPassword', 'new_password', 'current_password'];
    sensitiveFields.forEach(field => {
      if (safeBody[field]) {
        safeBody[field] = '***';
      }
    });
    
    console.log('📦 Body:', safeBody);
  }
  next();
});

/**
 * Мидлвар для проверки JWT токена
 * Используется для защиты всех приватных эндпоинтов
 */
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

/**
 * Мидлвар для проверки владельца цели
 * Убеждается, что пользователь имеет доступ к запрашиваемой цели
 */
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

// ============================================================
// ==================== СЕКЦИЯ 1: АУТЕНТИФИКАЦИЯ ====================
// ============================================================

/**
 * GET /api/health
 * Проверка работоспособности сервера
 */
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Сервер работает',
    timestamp: new Date().toISOString()
  });
});

/**
 * GET /api/test
 * Тестовый эндпоинт для отладки
 */
app.get('/api/test', (req, res) => {
  res.json({
    message: 'Сервер работает!',
    timestamp: new Date().toISOString(),
    endpoints: [
      '/api/health',
      '/api/auth/register',
      '/api/auth/login',
      '/api/auth/verify',
      '/api/user/profile',
      '/api/goals',
      '/api/scenarios',
      '/api/payments',
      '/api/checkpoints',
      '/api/forecast'
    ]
  });
});

/**
 * POST /api/auth/register
 * Регистрация нового пользователя
 * 
 * @body {string} email - Email пользователя
 * @body {string} password - Пароль (мин. 6 символов)
 * @body {string} first_name - Имя (опционально)
 * @body {string} last_name - Фамилия (опционально)
 * 
 * @returns {object} { token, user }
 */
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

    // Проверка формата email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Некорректный формат email' });
    }

    // Проверка уникальности email
    const userExists = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    if (userExists.rows.length > 0) {
      return res.status(400).json({ error: 'Пользователь с таким email уже существует' });
    }

    // Хеширование пароля
    const hashedPassword = await bcrypt.hash(password, 10);

    // Создание пользователя
    const result = await pool.query(
      `INSERT INTO users (email, password_hash, first_name, last_name, created_at, updated_at)
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING user_id, email, first_name, last_name, created_at`,
      [email, hashedPassword, first_name || null, last_name || null]
    );

    const user = result.rows[0];

    // Генерация JWT токена
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
    res.status(500).json({ error: 'Ошибка сервера при регистрации' });
  }
});

/**
 * POST /api/auth/login
 * Аутентификация пользователя
 * 
 * @body {string} email - Email пользователя
 * @body {string} password - Пароль
 * 
 * @returns {object} { token, user }
 */
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

/**
 * GET /api/auth/verify
 * Проверка валидности JWT токена
 */
app.get('/api/auth/verify', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT user_id, email, first_name, last_name FROM users WHERE user_id = $1',
      [req.user.userId]
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

/**
 * POST /api/auth/forgot-password
 * ЗАГОТОВКА: Отправка email для сброса пароля
 * В production здесь должна быть отправка письма с токеном
 */
app.post('/api/auth/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email обязателен' });
    }
    
    const userResult = await pool.query(
      'SELECT user_id FROM users WHERE email = $1',
      [email]
    );
    
    if (userResult.rows.length === 0) {
      // Не сообщаем, что пользователь не найден (безопасность)
      return res.json({ 
        message: 'Если пользователь с таким email существует, инструкция по сбросу пароля будет отправлена' 
      });
    }
    
    // В реальном приложении здесь:
    // 1. Генерируем токен сброса пароля
    // 2. Сохраняем его в БД с временем жизни
    // 3. Отправляем email со ссылкой
    
    console.log(`📧 Запрос сброса пароля для: ${email} (в production здесь будет отправлено письмо)`);
    
    res.json({ 
      message: 'Если пользователь с таким email существует, инструкция по сбросу пароля будет отправлена' 
    });
    
  } catch (error) {
    console.error('❌ Ошибка:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

/**
 * POST /api/auth/reset-password
 * ЗАГОТОВКА: Сброс пароля по токену
 * В production требует токен из email
 */
app.post('/api/auth/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    
    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Токен и новый пароль обязательны' });
    }
    
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Пароль должен быть не менее 6 символов' });
    }
    
    // В реальном приложении здесь:
    // 1. Проверяем токен в БД
    // 2. Проверяем, не истек ли он
    // 3. Обновляем пароль
    
    console.log('🔐 Запрос сброса пароля по токену (требуется реализация)');
    
    res.status(501).json({ 
      error: 'Функция сброса пароля требует реализации. Используйте демо-режим для тестирования.' 
    });
    
  } catch (error) {
    console.error('❌ Ошибка:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

/**
 * POST /api/auth/demo-reset-password
 * ДЕМО-РЕЖИМ: Только для разработки и тестирования!
 * НЕ ИСПОЛЬЗУЙТЕ В PRODUCTION
 */
if (process.env.NODE_ENV !== 'production') {
  app.post('/api/auth/demo-reset-password', async (req, res) => {
    console.warn('⚠️ ВНИМАНИЕ: Используется демо-эндпоинт сброса пароля!');
    console.warn('⚠️ Этот эндпоинт небезопасен и не должен использоваться в production!');
    
    try {
      const { email, newPassword } = req.body;
      
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
      
      console.log('✅ [DEMO] Пароль изменен для:', email);
      
      res.json({
        success: true,
        message: 'Пароль успешно изменен! (ДЕМО-РЕЖИМ)'
      });
      
    } catch (error) {
      console.error('❌ Ошибка:', error);
      res.status(500).json({ error: 'Ошибка сервера' });
    }
  });
}

// ============================================================
// ==================== СЕКЦИЯ 2: ПРОФИЛЬ ПОЛЬЗОВАТЕЛЯ ====================
// ============================================================

/**
 * GET /api/user/profile
 * Получение данных профиля текущего пользователя
 */
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

/**
 * PATCH /api/user/profile
 * Обновление профиля пользователя
 */
app.patch('/api/user/profile', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { first_name, last_name } = req.body;

    console.log('📝 Обновление профиля для пользователя:', userId);

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

/**
 * POST /api/user/change-password
 * Смена пароля пользователя
 */
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

// ============================================================
// ==================== СЕКЦИЯ 3: УПРАВЛЕНИЕ ЦЕЛЯМИ ====================
// ============================================================

/**
 * GET /api/goals
 * Получить все цели текущего пользователя
 */
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

/**
 * GET /api/goals/:goalId
 * Получить конкретную цель по ID
 */
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

/**
 * POST /api/goals
 * Создать новую финансовую цель
 * 
 * @body {string} title - Название цели
 * @body {number} target_amount - Целевая сумма
 * @body {number} monthly_contribution - Ежемесячный взнос
 * @body {date} start_date - Дата начала
 * @body {date} deadline_date - Желаемая дата достижения (опционально)
 * @body {number} initial_amount - Стартовая сумма (по умолчанию 0)
 */
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

    // Валидация обязательных полей
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

/**
 * PATCH /api/goals/:goalId
 * Обновить параметры цели
 */
app.patch('/api/goals/:goalId', authenticateToken, checkGoalOwnership, async (req, res) => {
  try {
    const { goalId } = req.params;
    const updates = req.body;

    console.log(`📝 Обновление цели ID: ${goalId}`, updates);

    // Валидация
    if (updates.target_amount !== undefined && updates.target_amount <= 0) {
      return res.status(400).json({ error: 'Целевая сумма должна быть больше 0' });
    }

    if (updates.monthly_contribution !== undefined && updates.monthly_contribution <= 0) {
      return res.status(400).json({ error: 'Ежемесячный взнос должен быть больше 0' });
    }

    if (updates.current_amount !== undefined && updates.current_amount < 0) {
      return res.status(400).json({ error: 'Текущая сумма не может быть отрицательной' });
    }

    // Динамическое обновление полей
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

/**
 * DELETE /api/goals/:goalId
 * Удалить цель (каскадно удаляет платежи, сценарии, прогнозы)
 */
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

// ============================================================
// ==================== СЕКЦИЯ 4: УПРАВЛЕНИЕ СЦЕНАРИЯМИ ====================
// ============================================================

/**
 * GET /api/scenarios/:goalId
 * Получить все сценарии для конкретной цели
 */
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

/**
 * GET /api/scenarios/scenario/:scenarioId
 * Получить сценарий по ID с проверкой доступа
 */
app.get('/api/scenarios/scenario/:scenarioId', authenticateToken, async (req, res) => {
  try {
    const { scenarioId } = req.params;

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

/**
 * POST /api/scenarios
 * Создать новый сценарий для цели
 * 
 * @body {number} goal_id - ID цели
 * @body {string} name - Название сценария
 * @body {number} monthly_contribution - Ежемесячный взнос
 * @body {number} expected_return - Ожидаемая доходность (%)
 * @body {number} inflation_rate - Ожидаемая инфляция (%)
 * @body {number} target_amount - Целевая сумма
 */
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

    // Проверка доступа к цели
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

    // Валидация
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

/**
 * PATCH /api/scenarios/:scenarioId
 * Обновить параметры сценария
 */
app.patch('/api/scenarios/:scenarioId', authenticateToken, async (req, res) => {
  try {
    const { scenarioId } = req.params;
    const updates = req.body;

    console.log(`📝 Обновление сценария ID: ${scenarioId}`, updates);

    // Проверка доступа
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

    // Валидация
    if (updates.monthly_contribution !== undefined && updates.monthly_contribution <= 0) {
      return res.status(400).json({ error: 'Ежемесячный взнос должен быть больше 0' });
    }

    if (updates.expected_return !== undefined && updates.expected_return < 0) {
      return res.status(400).json({ error: 'Доходность не может быть отрицательной' });
    }

    if (updates.inflation_rate !== undefined && updates.inflation_rate < 0) {
      return res.status(400).json({ error: 'Инфляция не может быть отрицательной' });
    }

    // Динамическое обновление
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

/**
 * DELETE /api/scenarios/:scenarioId
 * Удалить сценарий
 */
app.delete('/api/scenarios/:scenarioId', authenticateToken, async (req, res) => {
  try {
    const { scenarioId } = req.params;

    // Проверка доступа
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

// ============================================================
// ==================== СЕКЦИЯ 5: УПРАВЛЕНИЕ ПЛАТЕЖАМИ ====================
// ============================================================

/**
 * GET /api/payments/:goalId
 * Получить все платежи для конкретной цели
 */
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

/**
 * GET /api/payments/payment/:paymentId
 * Получить конкретный платеж по ID
 */
app.get('/api/payments/payment/:paymentId', authenticateToken, async (req, res) => {
  try {
    const { paymentId } = req.params;

    const result = await pool.query(
      `SELECT p.*, g.user_id 
       FROM payments p
       JOIN goals g ON p.goal_id = g.goal_id
       WHERE p.payment_id = $1`,
      [paymentId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Платеж не найден' });
    }

    if (result.rows[0].user_id !== req.user.userId) {
      return res.status(403).json({ error: 'Доступ запрещен' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Ошибка получения платежа:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

/**
 * POST /api/payments
 * Добавить новый платеж и обновить текущую сумму цели
 * 
 * @body {number} goal_id - ID цели
 * @body {number} amount - Сумма платежа
 * @body {date} payment_date - Дата платежа
 * @body {string} description - Описание платежа
 * 
 * Формула: current_amount = current_amount + amount
 */
app.post('/api/payments', authenticateToken, async (req, res) => {
  try {
    const { goal_id, amount, payment_date, description } = req.body;

    // Проверка доступа к цели
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

    // Валидация
    if (!goal_id || !amount || !payment_date) {
      return res.status(400).json({ error: 'Не все обязательные поля заполнены' });
    }

    // Добавление платежа
    const result = await pool.query(
      `INSERT INTO payments (goal_id, amount, payment_date, description)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [goal_id, amount, payment_date, description || '']
    );

    // Обновление текущей суммы цели (ФОРМУЛА: current_amount = current_amount + amount)
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

/**
 * PATCH /api/payments/:paymentId
 * Обновить существующий платеж и пересчитать current_amount цели
 */
app.patch('/api/payments/:paymentId', authenticateToken, async (req, res) => {
  try {
    const { paymentId } = req.params;
    const { amount, payment_date, description } = req.body;

    console.log(`📝 Обновление платежа ${paymentId}:`, { amount, payment_date, description });

    // Проверка доступа и получение текущего платежа
    const paymentCheck = await pool.query(
      `SELECT p.*, g.user_id, g.goal_id 
       FROM payments p
       JOIN goals g ON p.goal_id = g.goal_id
       WHERE p.payment_id = $1`,
      [paymentId]
    );

    if (paymentCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Платеж не найден' });
    }

    if (paymentCheck.rows[0].user_id !== req.user.userId) {
      return res.status(403).json({ error: 'Доступ запрещен' });
    }

    const oldPayment = paymentCheck.rows[0];
    const goalId = oldPayment.goal_id;

    // Начинаем транзакцию
    await pool.query('BEGIN');

    try {
      // Сначала вычитаем старую сумму из current_amount
      await pool.query(
        'UPDATE goals SET current_amount = current_amount - $1, updated_at = CURRENT_TIMESTAMP WHERE goal_id = $2',
        [parseFloat(oldPayment.amount), goalId]
      );

      // Обновляем платеж
      let updateQuery = 'UPDATE payments SET';
      const values = [];
      let paramIndex = 1;

      if (amount !== undefined) {
        updateQuery += ` amount = $${paramIndex}`;
        values.push(parseFloat(amount));
        paramIndex++;
      }

      if (payment_date !== undefined) {
        if (paramIndex > 1) updateQuery += ',';
        updateQuery += ` payment_date = $${paramIndex}`;
        values.push(payment_date);
        paramIndex++;
      }

      if (description !== undefined) {
        if (paramIndex > 1) updateQuery += ',';
        updateQuery += ` description = $${paramIndex}`;
        values.push(description);
        paramIndex++;
      }

      if (paramIndex === 1) {
        await pool.query('ROLLBACK');
        return res.status(400).json({ error: 'Нет полей для обновления' });
      }

      updateQuery += ` WHERE payment_id = $${paramIndex} RETURNING *`;
      values.push(paymentId);

      const updatedResult = await pool.query(updateQuery, values);
      const updatedPayment = updatedResult.rows[0];

      // Добавляем новую сумму обратно в current_amount
      const newAmount = amount !== undefined ? parseFloat(amount) : parseFloat(oldPayment.amount);
      await pool.query(
        'UPDATE goals SET current_amount = current_amount + $1, updated_at = CURRENT_TIMESTAMP WHERE goal_id = $2',
        [newAmount, goalId]
      );

      await pool.query('COMMIT');

      console.log('✅ Платеж обновлен, суммы пересчитаны');
      res.json(updatedPayment);

    } catch (error) {
      await pool.query('ROLLBACK');
      throw error;
    }

  } catch (error) {
    console.error('❌ Ошибка обновления платежа:', error);
    res.status(500).json({ error: 'Ошибка обновления платежа' });
  }
});

/**
 * DELETE /api/payments/:paymentId
 * Удалить платеж и вычесть его сумму из current_amount цели
 */
app.delete('/api/payments/:paymentId', authenticateToken, async (req, res) => {
  try {
    const { paymentId } = req.params;

    console.log(`🗑️ Удаление платежа ${paymentId}`);

    // Проверка доступа и получение платежа
    const paymentCheck = await pool.query(
      `SELECT p.*, g.user_id, g.goal_id 
       FROM payments p
       JOIN goals g ON p.goal_id = g.goal_id
       WHERE p.payment_id = $1`,
      [paymentId]
    );

    if (paymentCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Платеж не найден' });
    }

    if (paymentCheck.rows[0].user_id !== req.user.userId) {
      return res.status(403).json({ error: 'Доступ запрещен' });
    }

    const payment = paymentCheck.rows[0];
    const goalId = payment.goal_id;

    // Начинаем транзакцию
    await pool.query('BEGIN');

    try {
      // Вычитаем сумму платежа из current_amount цели
      await pool.query(
        'UPDATE goals SET current_amount = current_amount - $1, updated_at = CURRENT_TIMESTAMP WHERE goal_id = $2',
        [parseFloat(payment.amount), goalId]
      );

      // Удаляем платеж
      const result = await pool.query(
        'DELETE FROM payments WHERE payment_id = $1 RETURNING *',
        [paymentId]
      );

      await pool.query('COMMIT');

      console.log('✅ Платеж удален, сумма вычтена из цели');
      res.json({ 
        message: 'Платеж успешно удален', 
        deletedPayment: result.rows[0] 
      });

    } catch (error) {
      await pool.query('ROLLBACK');
      throw error;
    }

  } catch (error) {
    console.error('❌ Ошибка удаления платежа:', error);
    res.status(500).json({ error: 'Ошибка удаления платежа' });
  }
});

// ============================================================
// ==================== СЕКЦИЯ 6: УПРАВЛЕНИЕ КОНТРОЛЬНЫМИ ТОЧКАМИ ====================
// ============================================================

/**
 * GET /api/checkpoints
 * Получить все контрольные точки пользователя (по всем целям)
 */
app.get('/api/checkpoints', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    console.log(`📋 Запрос контрольных точек для пользователя ${userId}`);

    // Получение всех целей пользователя
    const goalsResult = await pool.query(
      'SELECT goal_id FROM goals WHERE user_id = $1',
      [userId]
    );

    const goalIds = goalsResult.rows.map(g => g.goal_id);

    if (goalIds.length === 0) {
      return res.json([]);
    }

    // Получение контрольных точек с сортировкой (pending → overdue → остальные)
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

/**
 * GET /api/checkpoints/goal/:goalId
 * Получить контрольные точки для конкретной цели
 */
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

/**
 * POST /api/checkpoints
 * Создать новую контрольную точку
 */
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

    // Проверка доступа к цели
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

    // Валидация
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

/**
 * PATCH /api/checkpoints/:checkpointId
 * Обновить контрольную точку
 */
app.patch('/api/checkpoints/:checkpointId', authenticateToken, async (req, res) => {
  try {
    const { checkpointId } = req.params;
    const updates = req.body;

    console.log(`📝 Обновление контрольной точки ${checkpointId}:`, updates);

    // Проверка доступа
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

    // Динамическое обновление
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

/**
 * DELETE /api/checkpoints/:checkpointId
 * Удалить контрольную точку
 */
app.delete('/api/checkpoints/:checkpointId', authenticateToken, async (req, res) => {
  try {
    const { checkpointId } = req.params;
    console.log(`🗑️ Удаление контрольной точки ${checkpointId}`);

    // Проверка доступа
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

// ============================================================
// ==================== СЕКЦИЯ 7: УПРАВЛЕНИЕ ПРОГНОЗАМИ ====================
// ============================================================

/**
 * GET /api/forecast/:goalId
 * Получить последний прогноз для цели
 */
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

/**
 * POST /api/forecast
 * Создать новый прогноз для цели
 */
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

    // Проверка доступа к цели
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

/**
 * DELETE /api/forecast/:forecastId
 * Удалить прогноз
 */
app.delete('/api/forecast/:forecastId', authenticateToken, async (req, res) => {
  try {
    const { forecastId } = req.params;

    // Проверка доступа
    const forecastCheck = await pool.query(
      `SELECT f.*, g.user_id 
       FROM forecasts f
       JOIN goals g ON f.goal_id = g.goal_id
       WHERE f.forecast_id = $1`,
      [forecastId]
    );

    if (forecastCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Прогноз не найден' });
    }

    if (forecastCheck.rows[0].user_id !== req.user.userId) {
      return res.status(403).json({ error: 'Доступ запрещен' });
    }

    const result = await pool.query(
      'DELETE FROM forecasts WHERE forecast_id = $1 RETURNING *',
      [forecastId]
    );

    res.json({ message: 'Прогноз успешно удален', deleted: result.rows[0] });
  } catch (error) {
    console.error('Ошибка удаления прогноза:', error);
    res.status(500).json({ error: 'Ошибка удаления прогноза' });
  }
});

// ============================================================
// ==================== СЕКЦИЯ 8: СТАТИСТИКА ====================
// ============================================================

/**
 * GET /api/user/stats
 * Получить агрегированную статистику пользователя
 */
app.get('/api/user/stats', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    const stats = await pool.query(
      `SELECT 
         COUNT(DISTINCT g.goal_id) as total_goals,
         COUNT(DISTINCT s.scenario_id) as total_scenarios,
         COUNT(DISTINCT p.payment_id) as total_payments,
         COALESCE(SUM(p.amount), 0) as total_saved,
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

    res.json(stats.rows[0] || { 
      total_goals: 0, 
      total_scenarios: 0, 
      total_payments: 0, 
      total_saved: 0, 
      total_checkpoints: 0, 
      completed_checkpoints: 0 
    });
  } catch (error) {
    console.error('Ошибка получения статистики:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// ============================================================
// ==================== СЕКЦИЯ 9: ОБРАБОТКА ОШИБОК ====================
// ============================================================

// Глобальный обработчик ошибок
app.use((err, req, res, next) => {
  console.error('❌ Необработанная ошибка:', err);
  res.status(500).json({ error: 'Внутренняя ошибка сервера' });
});

process.on('uncaughtException', (err) => {
  console.error('❌ Необработанная ошибка:', err);
  process.exit(1);
});

process.on('unhandledRejection', (err) => {
  console.error('❌ Необработанный reject:', err);
  process.exit(1);
});

// ============================================================
// ==================== ЗАПУСК СЕРВЕРА ====================
// ============================================================

app.listen(PORT, () => {
  console.log('\n' + '='.repeat(60));
  console.log(`🚀 Сервер запущен на порту ${PORT}`);
  console.log('='.repeat(60));
  console.log(`\n🔧 Режим: ${process.env.NODE_ENV || 'development'}`);
  console.log('\n📊 Доступные маршруты:');
  console.log('   🏥 GET  /api/health');
  console.log('   🔧 GET  /api/test');
  console.log('\n🔐 Аутентификация:');
  console.log('   📝 POST /api/auth/register');
  console.log('   🔑 POST /api/auth/login');
  console.log('   ✅ GET  /api/auth/verify');
  console.log('   📧 POST /api/auth/forgot-password (заготовка)');
  console.log('   🔐 POST /api/auth/reset-password (заготовка)');
  if (process.env.NODE_ENV !== 'production') {
    console.log('   ⚠️  POST /api/auth/demo-reset-password (ДЕМО-РЕЖИМ, НЕБЕЗОПАСНО!)');
  }
  console.log('\n👤 Профиль:');
  console.log('   👤 GET    /api/user/profile');
  console.log('   ✏️ PATCH  /api/user/profile');
  console.log('   🔒 POST   /api/user/change-password');
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
  console.log('   🔍 GET    /api/payments/payment/:paymentId');
  console.log('   ✨ POST   /api/payments');
  console.log('   📝 PATCH  /api/payments/:paymentId');
  console.log('   🗑️ DELETE /api/payments/:paymentId');
  console.log('\n📌 Контрольные точки:');
  console.log('   📋 GET    /api/checkpoints');
  console.log('   🎯 GET    /api/checkpoints/goal/:goalId');
  console.log('   ✨ POST   /api/checkpoints');
  console.log('   📝 PATCH  /api/checkpoints/:checkpointId');
  console.log('   🗑️ DELETE /api/checkpoints/:checkpointId');
  console.log('\n🔮 Прогнозы:');
  console.log('   🔍 GET    /api/forecast/:goalId');
  console.log('   ✨ POST   /api/forecast');
  console.log('   🗑️ DELETE /api/forecast/:forecastId');
  console.log('\n📊 Статистика:');
  console.log('   📈 GET    /api/user/stats');
  console.log('\n' + '='.repeat(60) + '\n');
});