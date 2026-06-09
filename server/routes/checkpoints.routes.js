// server/routes/checkpoints.routes.js
const express = require('express');
const pool = require('../config/database');
const { authenticateToken, checkGoalOwnership } = require('../middleware/auth');

const router = express.Router();

// Получить все контрольные точки пользователя
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const goalsResult = await pool.query('SELECT goal_id FROM goals WHERE user_id = $1', [userId]);

    const goalIds = goalsResult.rows.map(g => g.goal_id);

    if (goalIds.length === 0) {
      return res.json([]);
    }

    const checkpointsResult = await pool.query(
      `SELECT cp.*, COALESCE(cp.target_amount, cp.expected_amount) as display_amount,
       g.title as goal_title, g.target_amount as goal_target 
       FROM checkpoints cp
       JOIN goals g ON cp.goal_id = g.goal_id
       WHERE cp.goal_id = ANY($1::int[])
       ORDER BY CASE cp.status WHEN 'pending' THEN 1 WHEN 'overdue' THEN 2 ELSE 3 END,
       COALESCE(cp.target_date, cp.checkpoint_date) ASC NULLS LAST`,
      [goalIds]
    );

    res.json(checkpointsResult.rows);
  } catch (error) {
    console.error('❌ Ошибка получения контрольных точек:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Получить контрольные точки для цели
router.get('/goal/:goalId', authenticateToken, checkGoalOwnership, async (req, res) => {
  try {
    const { goalId } = req.params;
    const result = await pool.query(
      `SELECT * FROM checkpoints WHERE goal_id = $1 
       ORDER BY CASE status WHEN 'pending' THEN 1 WHEN 'overdue' THEN 2 ELSE 3 END,
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
router.get('/:checkpointId', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT cp.*, g.user_id, g.title AS goal_title, g.target_amount AS goal_target
       FROM checkpoints cp
       JOIN goals g ON cp.goal_id = g.goal_id
       WHERE cp.checkpoint_id = $1`,
      [req.params.checkpointId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Контрольная точка не найдена' });
    }
    if (result.rows[0].user_id !== req.user.userId) {
      return res.status(403).json({ error: 'Доступ запрещен' });
    }

    const { user_id, ...checkpoint } = result.rows[0];
    res.json(checkpoint);
  } catch (error) {
    console.error('Ошибка получения контрольной точки:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

router.post('/', authenticateToken, async (req, res) => {
  try {
    const { goal_id, title, target_amount, target_date, description, priority, status } = req.body;

    const goalCheck = await pool.query('SELECT user_id FROM goals WHERE goal_id = $1', [goal_id]);

    if (goalCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Цель не найдена' });
    }

    if (goalCheck.rows[0].user_id !== req.user.userId) {
      return res.status(403).json({ error: 'Доступ запрещен' });
    }

    const amount = Number(target_amount);
    if (!goal_id || !String(title || '').trim() || !Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ error: 'Не все обязательные поля заполнены' });
    }

    const result = await pool.query(
      `INSERT INTO checkpoints (goal_id, title, expected_amount, target_amount, target_date, description, priority, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [goal_id, String(title).trim(), amount, amount, target_date || null, description || '', priority || 'medium', status || 'pending']
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('❌ Ошибка создания контрольной точки:', error);
    res.status(500).json({ error: 'Ошибка создания контрольной точки' });
  }
});

// Обновить контрольную точку
router.patch('/:checkpointId', authenticateToken, async (req, res) => {
  try {
    const { checkpointId } = req.params;
    const updates = req.body;

    const checkpointCheck = await pool.query(
      `SELECT cp.*, g.user_id FROM checkpoints cp JOIN goals g ON cp.goal_id = g.goal_id WHERE cp.checkpoint_id = $1`,
      [checkpointId]
    );

    if (checkpointCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Контрольная точка не найдена' });
    }

    if (checkpointCheck.rows[0].user_id !== req.user.userId) {
      return res.status(403).json({ error: 'Доступ запрещен' });
    }

    let query = 'UPDATE checkpoints SET';
    const values = [];
    let paramIndex = 1;

    const fields = ['title', 'target_amount', 'target_date', 'description', 'priority', 'status'];

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

    query += ` WHERE checkpoint_id = $${paramIndex} RETURNING *`;
    values.push(checkpointId);

    const result = await pool.query(query, values);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('❌ Ошибка обновления контрольной точки:', error);
    res.status(500).json({ error: 'Ошибка обновления контрольной точки' });
  }
});

// Удалить контрольную точку
router.delete('/:checkpointId', authenticateToken, async (req, res) => {
  try {
    const { checkpointId } = req.params;

    const checkpointCheck = await pool.query(
      `SELECT cp.*, g.user_id FROM checkpoints cp JOIN goals g ON cp.goal_id = g.goal_id WHERE cp.checkpoint_id = $1`,
      [checkpointId]
    );

    if (checkpointCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Контрольная точка не найдена' });
    }

    if (checkpointCheck.rows[0].user_id !== req.user.userId) {
      return res.status(403).json({ error: 'Доступ запрещен' });
    }

    const result = await pool.query('DELETE FROM checkpoints WHERE checkpoint_id = $1 RETURNING *', [checkpointId]);
    res.json({ message: 'Контрольная точка успешно удалена', deleted: result.rows[0] });
  } catch (error) {
    console.error('❌ Ошибка удаления контрольной точки:', error);
    res.status(500).json({ error: 'Ошибка удаления контрольной точки' });
  }
});

module.exports = router;
