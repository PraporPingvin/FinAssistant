const express = require('express');
const pool = require('../config/database');
const { authenticateToken, checkGoalOwnership } = require('../middleware/auth');

const router = express.Router();

function parsePositiveAmount(value) {
  const amount = Number(value);
  return Number.isFinite(amount) && amount > 0 ? amount : null;
}

function isValidDate(value) {
  return value && !Number.isNaN(new Date(value).getTime());
}

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

router.get('/:goalId', authenticateToken, checkGoalOwnership, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM payments
       WHERE goal_id = $1
       ORDER BY payment_date DESC, created_at DESC, payment_id DESC`,
      [req.params.goalId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Ошибка получения платежей:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

router.get('/payment/:paymentId', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT p.*, g.user_id
       FROM payments p
       JOIN goals g ON p.goal_id = g.goal_id
       WHERE p.payment_id = $1`,
      [req.params.paymentId]
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

router.post('/', authenticateToken, async (req, res) => {
  const { goal_id: goalId, payment_date: paymentDate, description = '' } = req.body;
  const amount = parsePositiveAmount(req.body.amount);

  if (!goalId || amount === null || !isValidDate(paymentDate)) {
    return res.status(400).json({ error: 'Укажите цель, положительную сумму и корректную дату платежа' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const goalCheck = await client.query(
      'SELECT user_id FROM goals WHERE goal_id = $1 FOR UPDATE',
      [goalId]
    );

    if (goalCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Цель не найдена' });
    }

    if (goalCheck.rows[0].user_id !== req.user.userId) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'Доступ запрещен' });
    }

    const result = await client.query(
      `INSERT INTO payments (goal_id, amount, payment_date, description)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [goalId, amount, paymentDate, description]
    );
    await syncStoredCurrentAmount(client, goalId);
    await client.query('COMMIT');

    res.status(201).json(result.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Ошибка добавления платежа:', error);
    res.status(500).json({ error: 'Ошибка добавления платежа' });
  } finally {
    client.release();
  }
});

router.patch('/:paymentId', authenticateToken, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const paymentCheck = await client.query(
      `SELECT p.*, g.user_id
       FROM payments p
       JOIN goals g ON p.goal_id = g.goal_id
       WHERE p.payment_id = $1
       FOR UPDATE`,
      [req.params.paymentId]
    );

    if (paymentCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Платеж не найден' });
    }

    const oldPayment = paymentCheck.rows[0];
    if (oldPayment.user_id !== req.user.userId) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'Доступ запрещен' });
    }

    const amount = req.body.amount === undefined
      ? Number(oldPayment.amount)
      : parsePositiveAmount(req.body.amount);
    const paymentDate = req.body.payment_date ?? oldPayment.payment_date;
    const description = req.body.description ?? oldPayment.description ?? '';

    if (amount === null || !isValidDate(paymentDate)) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Укажите положительную сумму и корректную дату платежа' });
    }

    const result = await client.query(
      `UPDATE payments
       SET amount = $1, payment_date = $2, description = $3
       WHERE payment_id = $4
       RETURNING *`,
      [amount, paymentDate, description, req.params.paymentId]
    );
    await syncStoredCurrentAmount(client, oldPayment.goal_id);
    await client.query('COMMIT');

    res.json(result.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Ошибка обновления платежа:', error);
    res.status(500).json({ error: 'Ошибка обновления платежа' });
  } finally {
    client.release();
  }
});

router.delete('/:paymentId', authenticateToken, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const paymentCheck = await client.query(
      `SELECT p.*, g.user_id
       FROM payments p
       JOIN goals g ON p.goal_id = g.goal_id
       WHERE p.payment_id = $1
       FOR UPDATE`,
      [req.params.paymentId]
    );

    if (paymentCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Платеж не найден' });
    }

    const payment = paymentCheck.rows[0];
    if (payment.user_id !== req.user.userId) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'Доступ запрещен' });
    }

    await client.query('DELETE FROM payments WHERE payment_id = $1', [req.params.paymentId]);
    await syncStoredCurrentAmount(client, payment.goal_id);
    await client.query('COMMIT');

    res.json({ message: 'Платеж успешно удален' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Ошибка удаления платежа:', error);
    res.status(500).json({ error: 'Ошибка удаления платежа' });
  } finally {
    client.release();
  }
});

module.exports = router;
