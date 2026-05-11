// server/routes/scenarios.js
const express = require('express');
const router = express.Router();
const db = require('../db');

// Создание сценария
router.post('/goals/:goalId/scenarios', async (req, res) => {
  try {
    const { goalId } = req.params;
    const {
      name,
      monthly_contribution,
      expected_return,
      inflation_rate,
      target_amount
    } = req.body;

    // Проверка, существует ли цель
    const goalCheck = await db.query(
      'SELECT goal_id FROM goals WHERE goal_id = $1',
      [goalId]
    );

    if (goalCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Цель не найдена' });
    }

    // Создание сценария
    const result = await db.query(
      `INSERT INTO scenarios 
       (goal_id, name, monthly_contribution, expected_return, 
        inflation_rate, target_amount, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
       RETURNING *`,
      [
        goalId,
        name,
        monthly_contribution,
        expected_return,
        inflation_rate,
        target_amount || goalCheck.rows[0].target_amount
      ]
    );

    res.status(201).json({
      success: true,
      message: 'Сценарий успешно создан',
      scenario: result.rows[0]
    });

  } catch (error) {
    console.error('Ошибка создания сценария:', error);
    
    // Проверка на уникальность имени
    if (error.code === '23505') {
      return res.status(400).json({
        error: 'Сценарий с таким именем уже существует для этой цели'
      });
    }
    
    res.status(500).json({ 
      error: 'Ошибка сервера при создании сценария',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;