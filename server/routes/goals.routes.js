const express = require('express');
const pool = require('../config/database');
const { authenticateToken, checkGoalOwnership } = require('../middleware/auth');
const { validateGoal } = require('../middleware/validation');

const router = express.Router();

async function syncStoredCurrentAmount(client, goalId) {
  await client.query(
    `UPDATE goals g
     SET current_amount = COALESCE(g.initial_amount, 0) + COALESCE((
       SELECT SUM(p.amount) FROM payments p WHERE p.goal_id = g.goal_id
     ), 0),
     status = CASE
       WHEN g.status = 'paused' THEN g.status
       WHEN COALESCE(g.initial_amount, 0) + COALESCE((
         SELECT SUM(p.amount) FROM payments p WHERE p.goal_id = g.goal_id
       ), 0) >= g.target_amount THEN 'completed'
       ELSE 'active'
     END,
     updated_at = CURRENT_TIMESTAMP
     WHERE g.goal_id = $1`,
    [goalId]
  );
}

const goalSelect = `
  SELECT
    g.*,
    COALESCE(g.initial_amount, 0) + COALESCE(payments.total, 0) AS current_amount,
    COALESCE(payments.total, 0) AS payments_amount
  FROM goals g
  LEFT JOIN (
    SELECT goal_id, SUM(amount) AS total
    FROM payments
    GROUP BY goal_id
  ) payments ON payments.goal_id = g.goal_id
`;

router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `${goalSelect} WHERE g.user_id = $1 ORDER BY g.created_at DESC`,
      [req.user.userId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Ошибка получения целей:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

router.get('/:goalId', authenticateToken, checkGoalOwnership, async (req, res) => {
  try {
    const result = await pool.query(
      `${goalSelect} WHERE g.goal_id = $1`,
      [req.params.goalId]
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

    const result = await pool.query(
      `INSERT INTO goals
       (user_id, title, target_amount, monthly_contribution, start_date, deadline_date, initial_amount, status, current_amount)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        req.user.userId,
        title,
        target_amount,
        monthly_contribution,
        start_date,
        deadline_date,
        initial_amount,
        status,
        initial_amount
      ]
    );

    res.status(201).json({ ...result.rows[0], payments_amount: 0 });
  } catch (error) {
    console.error('Ошибка создания цели:', error);
    res.status(500).json({ error: 'Ошибка создания цели' });
  }
});

router.patch('/:goalId', authenticateToken, checkGoalOwnership, async (req, res) => {
  try {
    const { goalId } = req.params;
    const updates = req.body;
    let query = 'UPDATE goals SET updated_at = CURRENT_TIMESTAMP';
    const values = [];
    let paramIndex = 1;

    const fields = [
      'title',
      'target_amount',
      'monthly_contribution',
      'initial_amount',
      'start_date',
      'deadline_date',
      'status'
    ];

    fields.forEach((field) => {
      if (updates[field] !== undefined) {
        query += `, ${field} = $${paramIndex}`;
        values.push(updates[field]);
        paramIndex += 1;
      }
    });

    if (paramIndex === 1) {
      return res.status(400).json({ error: 'Нет полей для обновления' });
    }

    query += ` WHERE goal_id = $${paramIndex}`;
    values.push(goalId);
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(query, values);
      if (updates.initial_amount !== undefined || updates.target_amount !== undefined) {
        await syncStoredCurrentAmount(client, goalId);
      }
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

    const result = await pool.query(`${goalSelect} WHERE g.goal_id = $1`, [goalId]);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Ошибка обновления цели:', error);
    res.status(500).json({ error: 'Ошибка обновления цели' });
  }
});

router.delete('/:goalId', authenticateToken, checkGoalOwnership, async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM goals WHERE goal_id = $1 RETURNING *',
      [req.params.goalId]
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

module.exports = router;
