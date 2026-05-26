// server/routes/stats.routes.js
const express = require('express');
const pool = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Получить статистику пользователя
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    const stats = await pool.query(
      `SELECT 
         COUNT(DISTINCT g.goal_id) as total_goals,
         COUNT(DISTINCT s.scenario_id) as total_scenarios,
         COUNT(DISTINCT p.payment_id) as total_payments,
         COALESCE(SUM(p.amount), 0) as total_saved,
         COUNT(DISTINCT cp.checkpoint_id) as total_checkpoints,
         SUM(CASE WHEN cp.status = 'completed' THEN 1 ELSE 0 END) as completed_checkpoints
       FROM users u
       LEFT JOIN goals g ON u.user_id = g.user_id
       LEFT JOIN scenarios s ON g.goal_id = s.goal_id
       LEFT JOIN payments p ON g.goal_id = p.goal_id
       LEFT JOIN checkpoints cp ON g.goal_id = cp.goal_id
       WHERE u.user_id = $1
       GROUP BY u.user_id`,
      [userId]
    );

    res.json(stats.rows[0] || {
      total_goals: 0,
      total_scenarios: 0,
      total_payments: 0,
      total_saved: 0,
      total_checkpoints: 0,
      completed_checkpoints: 0
    });
  } catch (error) {
    console.error('Ошибка получения статистики:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

module.exports = router;