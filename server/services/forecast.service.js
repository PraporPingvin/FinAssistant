// server/services/forecast.service.js - ИСПРАВЛЕННАЯ ВЕРСИЯ (без monthly_contribution)

const pool = require('../config/database');

class ForecastService {
    async calculateForecast(goalId, userId) {
        try {
            console.log(`📊 Начинаем расчёт прогноза для цели ${goalId}`);

            // 1. Получаем данные цели
            const goalResult = await pool.query(
                'SELECT * FROM goals WHERE goal_id = $1 AND user_id = $2',
                [goalId, userId]
            );

            if (goalResult.rows.length === 0) {
                throw new Error('Цель не найдена');
            }

            const goal = goalResult.rows[0];
            console.log(`✅ Цель: ${goal.title}, сумма: ${goal.current_amount}/${goal.target_amount}`);

            // 2. Получаем сценарии
            const scenariosResult = await pool.query(
                'SELECT * FROM scenarios WHERE goal_id = $1',
                [goalId]
            );

            const scenarios = scenariosResult.rows;
            console.log(`📋 Найдено сценариев: ${scenarios.length}`);

            if (scenarios.length === 0) {
                throw new Error('Нет сценариев для расчёта прогноза');
            }

            const currentAmount = parseFloat(goal.current_amount || 0);
            const targetAmount = parseFloat(goal.target_amount);

            // 3. Рассчитываем прогноз для каждого сценария
            const scenariosForecast = [];
            let optimalScenario = null;
            let fastestMonths = Infinity;

            for (const scenario of scenarios) {
                const monthlyContribution = parseFloat(scenario.monthly_contribution);
                const expectedReturn = parseFloat(scenario.expected_return || 0) / 100;
                const monthlyReturn = expectedReturn / 12;

                let balance = currentAmount;
                let months = 0;

                console.log(`  🔄 Сценарий "${scenario.name}": взнос ${monthlyContribution}, доходность ${expectedReturn * 100}%`);

                while (balance < targetAmount && months < 1200) {
                    balance += monthlyContribution;
                    balance *= (1 + monthlyReturn);
                    months++;
                }

                const predictedDate = new Date();
                predictedDate.setMonth(predictedDate.getMonth() + months);

                const forecastItem = {
                    id: scenario.scenario_id,
                    name: scenario.name,
                    monthlyContribution: monthlyContribution,
                    expectedReturn: parseFloat(scenario.expected_return || 0),
                    monthsToGoal: months,
                    predictedDate: predictedDate.toISOString().split('T')[0],
                    finalAmount: Math.round(balance),
                    confidence: months < 60 ? 85 : (months < 120 ? 70 : 50),
                    risk: expectedReturn > 0.1 ? 'высокий' : (expectedReturn < 0.04 ? 'низкий' : 'средний')
                };

                scenariosForecast.push(forecastItem);

                if (months < fastestMonths) {
                    fastestMonths = months;
                    optimalScenario = forecastItem;
                }
            }

            // 4. Формируем результат
            const result = {
                goal: {
                    id: goal.goal_id,
                    title: goal.title,
                    current_amount: currentAmount,
                    target_amount: targetAmount,
                    remaining: targetAmount - currentAmount,
                    progress_percent: Math.round((currentAmount / targetAmount) * 100)
                },
                scenarios: scenariosForecast,
                optimalStrategy: optimalScenario ? optimalScenario.name : null,
                summary: `При текущем прогрессе ${Math.round((currentAmount / targetAmount) * 100)}% ` +
                    `и оптимальном сценарии "${optimalScenario?.name || 'не выбран'}" ` +
                    `цель будет достигнута через ${optimalScenario?.monthsToGoal || '?'} месяцев. ` +
                    `Рассмотрено ${scenariosForecast.length} различных стратегий.`,
                calculated_at: new Date().toISOString()
            };

            console.log(`✅ Прогноз рассчитан, оптимальный сценарий: ${optimalScenario?.name} (${optimalScenario?.monthsToGoal} мес.)`);

            // 5. Пытаемся сохранить (без monthly_contribution)
            try {
                await this.saveForecast(goalId, userId, result);
                console.log(`💾 Прогноз сохранён в БД`);
            } catch (saveError) {
                console.warn(`⚠️ Не удалось сохранить прогноз: ${saveError.message}`);
            }

            return result;

        } catch (error) {
            console.error('❌ Ошибка расчёта прогноза:', error);
            throw error;
        }
    }

    async saveForecast(goalId, userId, calculation) {
        try {
            const forecastDate = new Date().toISOString().split('T')[0];
            const optimalMonths = calculation.optimalStrategy ?
                calculation.scenarios.find(s => s.name === calculation.optimalStrategy)?.monthsToGoal : null;
            const predictedDate = optimalMonths ?
                calculation.scenarios.find(s => s.name === calculation.optimalStrategy)?.predictedDate : null;

            // Проверяем существование колонок
            const tableCheck = await pool.query(`
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'forecasts' AND column_name IN ('forecast_id', 'goal_id')
            `);

            if (tableCheck.rows.length === 0) {
                console.warn('⚠️ Таблица forecasts не найдена, пропускаем сохранение');
                return null;
            }

            // Сохраняем только существующие колонки (без monthly_contribution)
            const result = await pool.query(
                `INSERT INTO forecasts 
                 (goal_id, forecast_date, predicted_finish_date, remaining_months, 
                  current_amount, target_amount)
                 VALUES ($1, $2, $3, $4, $5, $6)
                 RETURNING *`,
                [
                    goalId,
                    forecastDate,
                    predictedDate,
                    optimalMonths,
                    calculation.goal.current_amount,
                    calculation.goal.target_amount
                ]
            );

            return result.rows[0];

        } catch (error) {
            console.error('Ошибка сохранения прогноза:', error.message);
            return null;
        }
    }

    // server/services/forecast.service.js

    async getLastForecast(goalId, userId) {
        try {
            // Сначала проверяем, что цель принадлежит пользователю
            const goalCheck = await pool.query(
                'SELECT goal_id FROM goals WHERE goal_id = $1 AND user_id = $2',
                [goalId, userId]
            );

            if (goalCheck.rows.length === 0) {
                console.log(`⚠️ Цель ${goalId} не найдена или не принадлежит пользователю ${userId}`);
                return null;
            }

            // Получаем последний прогноз
            const result = await pool.query(
                `SELECT * FROM forecasts 
             WHERE goal_id = $1 
             ORDER BY created_at DESC 
             LIMIT 1`,
                [goalId]
            );

            if (result.rows.length === 0) {
                console.log(`📊 Прогноз для цели ${goalId} не найден`);
                return null;
            }

            console.log(`✅ Прогноз для цели ${goalId} получен`);
            return result.rows[0];

        } catch (error) {
            console.error('❌ Ошибка получения прогноза:', error);
            return null;
        }
    }
}

module.exports = new ForecastService();