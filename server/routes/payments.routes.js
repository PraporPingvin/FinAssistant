// server/routes/payments.routes.js
const express = require('express');
const pool = require('../config/database');
const { authenticateToken, checkGoalOwnership } = require('../middleware/auth');

const router = express.Router();

// Получить платежи цели
router.get('/:goalId', authenticateToken, checkGoalOwnership, async (req, res) => {
  try {
    const { goalId } = req.params;
    const result = await pool.query('SELECT * FROM payments WHERE goal_id = $1 ORDER BY payment_date DESC', [goalId]);
    res.json(result.rows);
  } catch (error) {
    console.error('Ошибка получения платежей:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Получить конкретный платеж
router.get('/payment/:paymentId', authenticateToken, async (req, res) => {
  try {
    const { paymentId } = req.params;
    const result = await pool.query(
      `SELECT p.*, g.user_id FROM payments p JOIN goals g ON p.goal_id = g.goal_id WHERE p.payment_id = $1`,
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

// Создать платеж
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { goal_id, amount, payment_date, description } = req.body;

    const goalCheck = await pool.query('SELECT user_id FROM goals WHERE goal_id = $1', [goal_id]);

    if (goalCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Цель не найдена' });
    }

    if (goalCheck.rows[0].user_id !== req.user.userId) {
      return res.status(403).json({ error: 'Доступ запрещен' });
    }

    if (!goal_id || !amount || !payment_date) {
      return res.status(400).json({ error: 'Не все обязательные поля заполнены' });
    }

    const result = await pool.query(
      `INSERT INTO payments (goal_id, amount, payment_date, description)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [goal_id, amount, payment_date, description || '']
    );

    await pool.query('UPDATE goals SET current_amount = current_amount + $1, updated_at = CURRENT_TIMESTAMP WHERE goal_id = $2', [amount, goal_id]);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Ошибка добавления платежа:', error);
    res.status(500).json({ error: 'Ошибка добавления платежа' });
  }
});

// Обновить платеж
router.patch('/:paymentId', authenticateToken, async (req, res) => {
  try {
    const { paymentId } = req.params;
    const { amount, payment_date, description } = req.body;

    const paymentCheck = await pool.query(
      `SELECT p.*, g.user_id, g.goal_id FROM payments p JOIN goals g ON p.goal_id = g.goal_id WHERE p.payment_id = $1`,
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

    await pool.query('BEGIN');

    try {
      await pool.query('UPDATE goals SET current_amount = current_amount - $1 WHERE goal_id = $2', [parseFloat(oldPayment.amount), goalId]);

      const newAmount = amount !== undefined ? parseFloat(amount) : parseFloat(oldPayment.amount);
      await pool.query('UPDATE payments SET amount = $1, payment_date = $2, description = $3 WHERE payment_id = $4', [newAmount, payment_date, description, paymentId]);

      await pool.query('UPDATE goals SET current_amount = current_amount + $1 WHERE goal_id = $2', [newAmount, goalId]);

      await pool.query('COMMIT');

      const updated = await pool.query('SELECT * FROM payments WHERE payment_id = $1', [paymentId]);
      res.json(updated.rows[0]);
    } catch (error) {
      await pool.query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('❌ Ошибка обновления платежа:', error);
    res.status(500).json({ error: 'Ошибка обновления платежа' });
  }
});

// Удалить платеж
router.delete('/:paymentId', authenticateToken, async (req, res) => {
  try {
    const { paymentId } = req.params;

    const paymentCheck = await pool.query(
      `SELECT p.*, g.user_id, g.goal_id FROM payments p JOIN goals g ON p.goal_id = g.goal_id WHERE p.payment_id = $1`,
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

    await pool.query('BEGIN');

    try {
      await pool.query('UPDATE goals SET current_amount = current_amount - $1 WHERE goal_id = $2', [parseFloat(payment.amount), goalId]);
      await pool.query('DELETE FROM payments WHERE payment_id = $1', [paymentId]);
      await pool.query('COMMIT');

      res.json({ message: 'Платеж успешно удален' });
    } catch (error) {
      await pool.query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('❌ Ошибка удаления платежа:', error);
    res.status(500).json({ error: 'Ошибка удаления платежа' });
  }
});

module.exports = router;