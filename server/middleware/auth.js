// server/middleware/auth.js
const jwt = require('jsonwebtoken');
const pool = require('../config/database');

const JWT_SECRET = process.env.JWT_SECRET || 'finroad_secret_key_2024';

// Middleware для проверки JWT токена
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

// Middleware для проверки владельца цели
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

module.exports = { authenticateToken, checkGoalOwnership };