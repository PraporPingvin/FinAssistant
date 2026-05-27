// server/routes/auth.routes.js
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../config/database');
const { validateRegistration } = require('../middleware/validation');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'finroad_secret_key_2024';


// Регистрация
router.post('/register', validateRegistration, async (req, res) => {
    try {
        const { email, password, first_name, last_name } = req.body;
        console.log('📝 Попытка регистрации:', { email, first_name, last_name });

        const userExists = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (userExists.rows.length > 0) {
            return res.status(400).json({ error: 'Пользователь с таким email уже существует' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const result = await pool.query(
            `INSERT INTO users (email, password_hash, first_name, last_name, created_at, updated_at)
             VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
             RETURNING user_id, email, first_name, last_name`,
            [email, hashedPassword, first_name || null, last_name || null]
        );

        const user = result.rows[0];
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

// Логин
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        console.log('📝 Попытка входа:', email);

        if (!email || !password) {
            return res.status(400).json({ error: 'Email и пароль обязательны' });
        }

        const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
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

// ✅ ПРОСТОЙ СБРОС ПАРОЛЯ (без email-подтверждения) - ДЛЯ РАЗРАБОТКИ
router.post('/simple-reset-password', async (req, res) => {
    try {
        const { email, newPassword } = req.body;
        
        if (!email || !newPassword) {
            return res.status(400).json({ error: 'Email и новый пароль обязательны' });
        }
        
        if (newPassword.length < 6) {
            return res.status(400).json({ error: 'Пароль должен быть не менее 6 символов' });
        }
        
        const userResult = await pool.query('SELECT user_id FROM users WHERE email = $1', [email]);
        
        if (userResult.rows.length === 0) {
            return res.status(404).json({ error: 'Пользователь с таким email не найден' });
        }
        
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        
        await pool.query(
            'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE email = $2',
            [hashedPassword, email]
        );
        
        console.log(`✅ Пароль изменен для: ${email}`);
        res.json({ 
            success: true, 
            message: 'Пароль успешно изменен!' 
        });
        
    } catch (error) {
        console.error('❌ Ошибка сброса пароля:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Проверка токена
router.get('/verify', authenticateToken, async (req, res) => {
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

module.exports = router;