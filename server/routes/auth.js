const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';

// Временное хранилище для токенов сброса пароля
const resetTokens = new Map();

// Регистрация
router.post('/register', async (req, res) => {
  try {
    const { email, password, first_name, last_name } = req.body;
    const pool = req.app.locals.pool;

    console.log('📝 Попытка регистрации:', { email, first_name, last_name });

    if (!email || !password) {
      return res.status(400).json({ error: 'Email и пароль обязательны' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Пароль должен быть не менее 6 символов' });
    }

    const userExists = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    if (userExists.rows.length > 0) {
      return res.status(400).json({ error: 'Пользователь с таким email уже существует' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `INSERT INTO users (email, password_hash, first_name, last_name, created_at, updated_at)
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING user_id, email, first_name, last_name, created_at`,
      [email, hashedPassword, first_name || null, last_name || null]
    );

    const user = result.rows[0];

    const token = jwt.sign(
      { userId: user.user_id, email: user.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    console.log('✅ Регистрация успешна для:', user.email);

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

// Вход
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const pool = req.app.locals.pool;

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

    console.log('✅ Вход выполнен для:', user.email);

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
router.get('/verify', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    const pool = req.app.locals.pool;

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

// Запрос на сброс пароля
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    const pool = req.app.locals.pool;

    console.log('📝 Запрос на сброс пароля для:', email);

    if (!email) {
      return res.status(400).json({ error: 'Email обязателен' });
    }

    // Проверяем, существует ли пользователь
    const userResult = await pool.query(
      'SELECT user_id, email FROM users WHERE email = $1',
      [email]
    );

    if (userResult.rows.length === 0) {
      // Для безопасности не сообщаем, что пользователь не найден
      console.log('ℹ️ Пользователь не найден, но отправляем успешный ответ');
      return res.json({ 
        message: 'Если пользователь с таким email существует, инструкция по восстановлению пароля будет отправлена' 
      });
    }

    const user = userResult.rows[0];

    // Генерируем уникальный токен
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = Date.now() + 3600000; // 1 час

    // Сохраняем токен
    resetTokens.set(token, {
      userId: user.user_id,
      email: user.email,
      expiresAt
    });

    // В реальном приложении здесь отправка email
    console.log(`🔐 Токен для сброса пароля: ${token}`);
    console.log(`🔗 Ссылка для сброса: http://localhost:5173/reset-password?token=${token}`);

    res.json({ 
      message: 'Инструкция по восстановлению пароля отправлена на ваш email',
      // В демо-режиме возвращаем токен для тестирования
      devToken: token
    });

  } catch (error) {
    console.error('❌ Ошибка при запросе сброса пароля:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Сброс пароля с токеном
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    const pool = req.app.locals.pool;

    console.log('📝 Попытка сброса пароля с токеном');

    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Токен и новый пароль обязательны' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Пароль должен быть не менее 6 символов' });
    }

    // Проверяем токен
    const resetData = resetTokens.get(token);
    
    if (!resetData) {
      return res.status(400).json({ error: 'Недействительный или устаревший токен' });
    }

    if (Date.now() > resetData.expiresAt) {
      resetTokens.delete(token);
      return res.status(400).json({ error: 'Срок действия токена истек' });
    }

    // Хешируем новый пароль
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Обновляем пароль в базе
    await pool.query(
      'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2',
      [hashedPassword, resetData.userId]
    );

    // Удаляем использованный токен
    resetTokens.delete(token);

    console.log('✅ Пароль успешно изменен для пользователя:', resetData.email);

    res.json({ 
      message: 'Пароль успешно изменен. Теперь вы можете войти с новым паролем.' 
    });

  } catch (error) {
    console.error('❌ Ошибка при сбросе пароля:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

module.exports = router;