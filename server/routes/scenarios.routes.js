// server/routes/scenarios.routes.js
const express = require('express');
const pool = require('../config/database');
const { authenticateToken, checkGoalOwnership } = require('../middleware/auth');

const router = express.Router();

function parseOptionalNumber(value) {
  if (value === undefined || value === null || value === '') return undefined;
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}

function validateScenarioNumbers({ monthly, growth, inflation, target }) {
  if (monthly <= 0) return 'Ежемесячный взнос должен быть больше 0';
  if (growth < 0 || growth > 100) return 'Ожидаемый годовой прирост должен быть от 0 до 100%';
  if (inflation < 0 || inflation > 100) return 'Инфляция должна быть от 0 до 100%';
  if (target <= 0) return 'Целевая сумма должна быть больше 0';
  return null;
}

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

router.get('/scenario/:scenarioId', authenticateToken, async (req, res) => {
  try {
    const { scenarioId } = req.params;
    const scenarioCheck = await pool.query(
      `SELECT s.*, g.user_id
       FROM scenarios s
       JOIN goals g ON s.goal_id = g.goal_id
       WHERE s.scenario_id = $1`,
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

    const scenarioName = String(name || '').trim();
    const monthly = parseOptionalNumber(monthly_contribution);
    const growth = parseOptionalNumber(expected_return);
    const inflation = parseOptionalNumber(inflation_rate);
    const target = parseOptionalNumber(target_amount);

    if (!goal_id || !scenarioName || monthly === undefined || growth === undefined || inflation === undefined || target === undefined) {
      return res.status(400).json({ error: 'Не все обязательные поля заполнены' });
    }

    const validationError = validateScenarioNumbers({ monthly, growth, inflation, target });
    if (validationError) return res.status(400).json({ error: validationError });

    const result = await pool.query(
      `INSERT INTO scenarios (goal_id, name, monthly_contribution, expected_return, inflation_rate, target_amount)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [goal_id, scenarioName, monthly, growth, inflation, target]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Ошибка создания сценария:', error);
    res.status(500).json({ error: 'Ошибка создания сценария' });
  }
});

router.patch('/:scenarioId', authenticateToken, async (req, res) => {
  try {
    const { scenarioId } = req.params;
    const updates = req.body;

    const scenarioCheck = await pool.query(
      `SELECT s.*, g.user_id
       FROM scenarios s
       JOIN goals g ON s.goal_id = g.goal_id
       WHERE s.scenario_id = $1`,
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

    if (updates.name !== undefined) {
      const scenarioName = String(updates.name || '').trim();
      if (!scenarioName) {
        return res.status(400).json({ error: 'Название сценария обязательно' });
      }
      query += ` name = $${paramIndex}`;
      values.push(scenarioName);
      paramIndex++;
    }

    const numericFields = ['monthly_contribution', 'expected_return', 'inflation_rate', 'target_amount'];
    const nextNumbers = {
      monthly: Number(scenarioCheck.rows[0].monthly_contribution),
      growth: Number(scenarioCheck.rows[0].expected_return),
      inflation: Number(scenarioCheck.rows[0].inflation_rate),
      target: Number(scenarioCheck.rows[0].target_amount),
    };
    numericFields.forEach((field) => {
      if (updates[field] !== undefined) {
        const value = parseOptionalNumber(updates[field]);
        if (value === undefined) return;
        const key = {
          monthly_contribution: 'monthly',
          expected_return: 'growth',
          inflation_rate: 'inflation',
          target_amount: 'target',
        }[field];
        nextNumbers[key] = value;
        if (paramIndex > 1) query += ',';
        query += ` ${field} = $${paramIndex}`;
        values.push(value);
        paramIndex++;
      }
    });
    const validationError = validateScenarioNumbers(nextNumbers);
    if (validationError) return res.status(400).json({ error: validationError });

    if (paramIndex === 1) {
      return res.status(400).json({ error: 'Нет полей для обновления' });
    }

    query += ` WHERE scenario_id = $${paramIndex} RETURNING *`;
    values.push(scenarioId);

    const result = await pool.query(query, values);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Ошибка обновления сценария:', error);
    res.status(500).json({ error: 'Ошибка обновления сценария' });
  }
});

router.delete('/:scenarioId', authenticateToken, async (req, res) => {
  const client = await pool.connect();

  try {
    const { scenarioId } = req.params;

    const scenarioCheck = await client.query(
      `SELECT s.*, g.user_id
       FROM scenarios s
       JOIN goals g ON s.goal_id = g.goal_id
       WHERE s.scenario_id = $1`,
      [scenarioId]
    );

    if (scenarioCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Сценарий не найден' });
    }

    if (scenarioCheck.rows[0].user_id !== req.user.userId) {
      return res.status(403).json({ error: 'Доступ запрещен' });
    }

    await client.query('BEGIN');
    await client.query('UPDATE forecasts SET scenario_id = NULL WHERE scenario_id = $1', [scenarioId]);
    const result = await client.query('DELETE FROM scenarios WHERE scenario_id = $1 RETURNING *', [scenarioId]);
    await client.query('COMMIT');

    res.json({ success: true, message: 'Сценарий успешно удален', deletedScenario: result.rows[0] });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Ошибка удаления сценария:', error);
    res.status(500).json({ error: 'Ошибка удаления сценария' });
  } finally {
    client.release();
  }
});

module.exports = router;
