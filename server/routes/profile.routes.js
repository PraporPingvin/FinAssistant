// server/routes/profile.routes.js
const express = require('express');
const bcrypt = require('bcrypt');
const pool = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Получить профиль
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const result = await pool.query('SELECT user_id, email, first_name, last_name, created_at FROM users WHERE user_id = $1', [userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('❌ Ошибка получения профиля:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Обновить профиль
router.patch('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { first_name, last_name } = req.body;

    const result = await pool.query(
      `UPDATE users SET first_name = $1, last_name = $2, updated_at = CURRENT_TIMESTAMP 
       WHERE user_id = $3 RETURNING user_id, email, first_name, last_name`,
      [first_name || null, last_name || null, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    res.json({ success: true, user: result.rows[0] });
  } catch (error) {
    console.error('❌ Ошибка обновления профиля:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Сменить пароль
router.post('/change-password', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Текущий и новый пароль обязательны' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Новый пароль должен быть не менее 6 символов' });
    }

    const userResult = await pool.query('SELECT password_hash FROM users WHERE user_id = $1', [userId]);

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    const validPassword = await bcrypt.compare(currentPassword, userResult.rows[0].password_hash);

    if (!validPassword) {
      return res.status(401).json({ error: 'Неверный текущий пароль' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2', [hashedPassword, userId]);

    res.json({ message: 'Пароль успешно изменен' });
  } catch (error) {
    console.error('❌ Ошибка смены пароля:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

module.exports = router;