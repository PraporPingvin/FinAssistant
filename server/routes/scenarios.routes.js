// server/routes/scenarios.routes.js
const express = require('express');
const pool = require('../config/database');
const { authenticateToken, checkGoalOwnership } = require('../middleware/auth');

const router = express.Router();

// Получить все сценарии для цели
router.get('/:goalId', authenticateToken, checkGoalOwnership, async (req, res) => {
  try {
    const { goalId } = req.params;
    const result = await pool.query('SELECT * FROM scenarios WHERE goal_id = $1 ORDER BY created_at DESC', [goalId]);
    res.json(result.rows);
  } catch (error) {
    console.error('Ошибка получения сценариев:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Получить сценарий по ID
router.get('/scenario/:scenarioId', authenticateToken, async (req, res) => {
  try {
    const { scenarioId } = req.params;
    const scenarioCheck = await pool.query(
      `SELECT s.*, g.user_id FROM scenarios s JOIN goals g ON s.goal_id = g.goal_id WHERE s.scenario_id = $1`,
      [scenarioId]
    );

    if (scenarioCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Сценарий не найден' });
    }

    if (scenarioCheck.rows[0].user_id !== req.user.userId) {
      return res.status(403).json({ error: 'Доступ запрещен' });
    }

    res.json(scenarioCheck.rows[0]);
  } catch (error) {
    console.error('Ошибка получения сценария:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Создать сценарий
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { goal_id, name, monthly_contribution, expected_return, inflation_rate, target_amount } = req.body;

    const goalCheck = await pool.query('SELECT user_id FROM goals WHERE goal_id = $1', [goal_id]);

    if (goalCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Цель не найдена' });
    }

    if (goalCheck.rows[0].user_id !== req.user.userId) {
      return res.status(403).json({ error: 'Доступ запрещен' });
    }

    if (!goal_id || !name || !monthly_contribution || !expected_return || !inflation_rate || !target_amount) {
      return res.status(400).json({ error: 'Не все обязательные поля заполнены' });
    }

    const result = await pool.query(
      `INSERT INTO scenarios (goal_id, name, monthly_contribution, expected_return, inflation_rate, target_amount)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [goal_id, name, monthly_contribution, expected_return, inflation_rate, target_amount]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Ошибка создания сценария:', error);
    res.status(500).json({ error: 'Ошибка создания сценария' });
  }
});

// Обновить сценарий
router.patch('/:scenarioId', authenticateToken, async (req, res) => {
  try {
    const { scenarioId } = req.params;
    const updates = req.body;

    const scenarioCheck = await pool.query(
      `SELECT s.*, g.user_id FROM scenarios s JOIN goals g ON s.goal_id = g.goal_id WHERE s.scenario_id = $1`,
      [scenarioId]
    );

    if (scenarioCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Сценарий не найден' });
    }

    if (scenarioCheck.rows[0].user_id !== req.user.userId) {
      return res.status(403).json({ error: 'Доступ запрещен' });
    }

    let query = 'UPDATE scenarios SET';
    const values = [];
    let paramIndex = 1;

    const fields = ['name', 'monthly_contribution', 'expected_return', 'inflation_rate', 'target_amount'];

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

    query += ` WHERE scenario_id = $${paramIndex} RETURNING *`;
    values.push(scenarioId);

    const result = await pool.query(query, values);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('❌ Ошибка обновления сценария:', error);
    res.status(500).json({ error: 'Ошибка обновления сценария' });
  }
});

// Удалить сценарий
router.delete('/:scenarioId', authenticateToken, async (req, res) => {
  try {
    const { scenarioId } = req.params;

    const scenarioCheck = await pool.query(
      `SELECT s.*, g.user_id FROM scenarios s JOIN goals g ON s.goal_id = g.goal_id WHERE s.scenario_id = $1`,
      [scenarioId]
    );

    if (scenarioCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Сценарий не найден' });
    }

    if (scenarioCheck.rows[0].user_id !== req.user.userId) {
      return res.status(403).json({ error: 'Доступ запрещен' });
    }

    const result = await pool.query('DELETE FROM scenarios WHERE scenario_id = $1 RETURNING *', [scenarioId]);
    res.json({ success: true, message: 'Сценарий успешно удален', deletedScenario: result.rows[0] });
  } catch (error) {
    console.error('Ошибка удаления сценария:', error);
    res.status(500).json({ error: 'Ошибка удаления сценария' });
  }
});

module.exports = router;