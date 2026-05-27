// server/routes/forecasts.routes.js
const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const forecastService = require('../services/forecast.service');

const router = express.Router();

// ✅ ПОЛУЧИТЬ ПРОГНОЗ ПО ID ЦЕЛИ (GET)
router.get('/:goalId', authenticateToken, async (req, res) => {
    try {
        const { goalId } = req.params;
        
        console.log(`📊 Получение прогноза для цели ${goalId}`);
        
        // Пытаемся получить сохранённый прогноз
        const forecast = await forecastService.getLastForecast(goalId, req.user.userId);
        
        if (!forecast) {
            // Если прогноза нет, возвращаем 404 с информацией
            return res.status(404).json({ 
                error: 'Прогноз не найден',
                message: 'Прогноз ещё не рассчитан. Используйте POST /api/forecast/:goalId для расчёта.'
            });
        }
        
        res.json(forecast);
        
    } catch (error) {
        console.error('❌ Ошибка получения прогноза:', error);
        res.status(500).json({ error: error.message });
    }
});

// ✅ РАССЧИТАТЬ И СОХРАНИТЬ ПРОГНОЗ (POST)
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
        console.error('❌ Ошибка расчёта прогноза:', error);
        res.status(500).json({ error: error.message });
    }
});

// ✅ ПОЛУЧИТЬ ПРОГНОЗ С АВТОМАТИЧЕСКИМ РАСЧЁТОМ (если нет сохранённого)
router.get('/:goalId/with-calc', authenticateToken, async (req, res) => {
    try {
        const { goalId } = req.params;
        
        console.log(`📊 Получение или расчёт прогноза для цели ${goalId}`);
        
        // Пытаемся получить сохранённый прогноз
        let forecast = await forecastService.getLastForecast(goalId, req.user.userId);
        
        // Если прогноза нет, рассчитываем новый
        if (!forecast) {
            console.log(`📊 Прогноза нет, выполняем расчёт...`);
            forecast = await forecastService.calculateForecast(goalId, req.user.userId);
        }
        
        res.json({
            success: true,
            forecast: forecast
        });
        
    } catch (error) {
        console.error('❌ Ошибка:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;