const express = require('express');
const pool = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `WITH user_goals AS (
         SELECT goal_id, COALESCE(initial_amount, 0) AS initial_amount
         FROM goals
         WHERE user_id = $1
       ),
       goal_stats AS (
         SELECT COUNT(*) AS total_goals, COALESCE(SUM(initial_amount), 0) AS initial_saved
         FROM user_goals
       ),
       scenario_stats AS (
         SELECT COUNT(*) AS total_scenarios
         FROM scenarios s
         JOIN user_goals g ON g.goal_id = s.goal_id
       ),
       payment_stats AS (
         SELECT COUNT(*) AS total_payments, COALESCE(SUM(p.amount), 0) AS payment_saved
         FROM payments p
         JOIN user_goals g ON g.goal_id = p.goal_id
       ),
       checkpoint_stats AS (
         SELECT
           COUNT(*) AS total_checkpoints,
           COUNT(*) FILTER (WHERE cp.status = 'completed') AS completed_checkpoints
         FROM checkpoints cp
         JOIN user_goals g ON g.goal_id = cp.goal_id
       )
       SELECT
         goal_stats.total_goals,
         scenario_stats.total_scenarios,
         payment_stats.total_payments,
         goal_stats.initial_saved + payment_stats.payment_saved AS total_saved,
         checkpoint_stats.total_checkpoints,
         checkpoint_stats.completed_checkpoints
       FROM goal_stats, scenario_stats, payment_stats, checkpoint_stats`,
      [req.user.userId]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Ошибка получения статистики:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

module.exports = router;
