// server/routes/forecast.routes.js
const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const forecastService = require('../services/forecast.service');

const router = express.Router();

// Рассчитать и сохранить прогноз
router.post('/:goalId', authenticateToken, async (req, res) => {
    try {
        const { goalId } = req.params;
        
        console.log(`📊 Расчёт прогноза для цели ${goalId}`);
        
        const forecast = await forecastService.calculateForecast(goalId, req.user.userId);
        
        res.status(201).json({
            success: true,
            message: 'Прогноз успешно рассчитан',
            forecast: forecast
        });
        
    } catch (error) {
        console.error('❌ Ошибка:', error);
        res.status(500).json({ error: error.message });
    }
});

// Получить последний прогноз
router.get('/:goalId', authenticateToken, async (req, res) => {
    try {
        const { goalId } = req.params;
        
        const forecast = await forecastService.getLastForecast(goalId, req.user.userId);
        
        if (!forecast) {
            return res.status(404).json({ 
                error: 'Прогноз не найден',
                message: 'Создайте прогноз через POST /api/forecast/:goalId'
            });
        }
        
        res.json(forecast);
        
    } catch (error) {
        console.error('❌ Ошибка:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;