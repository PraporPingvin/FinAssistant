// server/routes/goals.routes.js
const express = require('express');
const pool = require('../config/database');
const { authenticateToken, checkGoalOwnership } = require('../middleware/auth');
const { validateGoal } = require('../middleware/validation');

const router = express.Router();

// Получить все цели пользователя
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const result = await pool.query('SELECT * FROM goals WHERE user_id = $1 ORDER BY created_at DESC', [userId]);
    res.json(result.rows);
  } catch (error) {
    console.error('Ошибка получения целей:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Получить конкретную цель
router.get('/:goalId', authenticateToken, checkGoalOwnership, async (req, res) => {
  try {
    const { goalId } = req.params;
    const result = await pool.query('SELECT * FROM goals WHERE goal_id = $1', [goalId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Цель не найдена' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Ошибка получения цели:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Создать цель
router.post('/', authenticateToken, validateGoal, async (req, res) => {
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
router.patch('/:goalId', authenticateToken, checkGoalOwnership, async (req, res) => {
  try {
    const { goalId } = req.params;
    const updates = req.body;

    console.log(`📝 Обновление цели ID: ${goalId}`, updates);

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
    res.json(result.rows[0]);
  } catch (error) {
    console.error('❌ Ошибка обновления цели:', error);
    res.status(500).json({ error: 'Ошибка обновления цели' });
  }
});

// Удалить цель
router.delete('/:goalId', authenticateToken, checkGoalOwnership, async (req, res) => {
  try {
    const { goalId } = req.params;
    const result = await pool.query('DELETE FROM goals WHERE goal_id = $1 RETURNING *', [goalId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Цель не найдена' });
    }

    res.json({ message: 'Цель успешно удалена', deletedGoal: result.rows[0] });
  } catch (error) {
    console.error('Ошибка удаления цели:', error);
    res.status(500).json({ error: 'Ошибка удаления цели' });
  }
});

module.exports = router;