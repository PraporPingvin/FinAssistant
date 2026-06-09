const pool = require('../config/database');

function getGoalCurrentAmount(goal, payments = []) {
  return Number(goal?.initial_amount || 0) + payments.reduce(
    (sum, payment) => sum + Number(payment.amount || 0),
    0
  );
}

function calculateRealAnnualReturn(expectedReturn, inflation) {
  const nominalFactor = 1 + Number(expectedReturn || 0) / 100;
  const inflationFactor = 1 + Number(inflation || 0) / 100;
  if (inflationFactor <= 0) return -99;
  return (nominalFactor / inflationFactor - 1) * 100;
}

function calculateMonthlyRate(annualRate) {
  const value = Number(annualRate || 0);
  if (value <= -99) return -0.99;
  return Math.pow(1 + value / 100, 1 / 12) - 1;
}

function calculateRisk(expectedReturn, isBaseline = false) {
  if (isBaseline || Number(expectedReturn || 0) < 5) return 'Низкий';
  if (Number(expectedReturn || 0) < 10) return 'Средний';
  return 'Высокий';
}

function calculateConfidence(monthsToGoal, effectiveReturn, risk) {
  if (!Number.isFinite(monthsToGoal)) return 20;
  const timeScore = Math.max(0, 100 - Math.max(0, monthsToGoal - 24));
  const returnScore = Math.max(-15, Math.min(15, effectiveReturn * 2));
  const riskPenalty = risk === 'Высокий' ? 16 : risk === 'Средний' ? 8 : 0;
  return Math.max(25, Math.min(98, Math.round(timeScore + returnScore - riskPenalty)));
}

function buildBaselineScenario(goal) {
  return {
    scenario_id: null,
    name: 'План цели без сценариев',
    monthly_contribution: Number(goal.monthly_contribution || 0),
    expected_return: 0,
    inflation_rate: 0,
    target_amount: Number(goal.target_amount || 0),
    isBaseline: true,
  };
}

function simulateScenario({ currentAmount, targetAmount, scenario }) {
  const monthlyContribution = Number(scenario.monthly_contribution || 0);
  const expectedReturn = Number(scenario.expected_return || 0);
  const inflationRate = Number(scenario.inflation_rate || 0);
  const effectiveReturn = calculateRealAnnualReturn(expectedReturn, inflationRate);
  const monthlyRate = calculateMonthlyRate(effectiveReturn);
  const isBaseline = Boolean(scenario.isBaseline);
  let balance = currentAmount;
  let months = 0;

  while (balance < targetAmount && months < 1200) {
    if (monthlyContribution <= 0 && monthlyRate <= 0) {
      months = Infinity;
      break;
    }
    balance = balance * (1 + monthlyRate) + monthlyContribution;
    months += 1;
  }

  if (months >= 1200 && balance < targetAmount) months = Infinity;

  const predictedDate = Number.isFinite(months) ? new Date() : null;
  if (predictedDate) predictedDate.setMonth(predictedDate.getMonth() + months);
  const risk = calculateRisk(expectedReturn, isBaseline);

  return {
    id: scenario.scenario_id,
    name: scenario.name,
    isBaseline,
    monthlyContribution,
    expectedReturn,
    inflationRate,
    effectiveReturn,
    monthsToGoal: Number.isFinite(months) ? months : null,
    predictedDate: predictedDate ? predictedDate.toISOString().split('T')[0] : null,
    finalAmount: Number.isFinite(months) ? Math.round(Math.max(balance, targetAmount)) : Math.round(balance),
    confidence: calculateConfidence(months, effectiveReturn, risk),
    risk,
  };
}

function buildSummary({ currentAmount, targetAmount, optimalScenario, baselineScenario, scenariosCount }) {
  const progress = targetAmount > 0 ? Math.round((currentAmount / targetAmount) * 100) : 0;

  if (baselineScenario.monthsToGoal === null) {
    return 'По базовому плану цель не будет достигнута: укажите ежемесячный взнос или создайте сценарий.';
  }
  if (!scenariosCount) {
    return `Показан базовый план цели: прогресс ${progress}%, примерный срок ${baselineScenario.monthsToGoal} мес.`;
  }
  if (optimalScenario?.name !== baselineScenario.name && optimalScenario?.monthsToGoal !== null) {
    return `Лучший вариант: «${optimalScenario.name}». Срок ${optimalScenario.monthsToGoal} мес. Базовый план оставлен для сравнения.`;
  }
  return `Базовый план выглядит оптимальным: прогресс ${progress}%, примерный срок ${baselineScenario.monthsToGoal} мес.`;
}

class ForecastService {
  async calculateForecast(goalId, userId) {
    const goalResult = await pool.query(
      'SELECT * FROM goals WHERE goal_id = $1 AND user_id = $2',
      [goalId, userId]
    );
    if (goalResult.rows.length === 0) throw new Error('Цель не найдена');

    const goal = goalResult.rows[0];
    const [scenariosResult, paymentsResult] = await Promise.all([
      pool.query('SELECT * FROM scenarios WHERE goal_id = $1 ORDER BY created_at DESC', [goalId]),
      pool.query('SELECT * FROM payments WHERE goal_id = $1', [goalId]),
    ]);

    const targetAmount = Number(goal.target_amount || 0);
    const currentAmount = Math.min(targetAmount, getGoalCurrentAmount(goal, paymentsResult.rows));
    const baselineScenario = buildBaselineScenario(goal);
    const forecasts = [baselineScenario, ...scenariosResult.rows].map((scenario) => {
      const scenarioTarget = Number(scenario.target_amount || targetAmount);
      return simulateScenario({
        currentAmount: Math.min(scenarioTarget, currentAmount),
        targetAmount: scenarioTarget,
        scenario,
      });
    });
    const reachable = forecasts.filter((scenario) => scenario.monthsToGoal !== null);
    const optimalScenario = reachable.length
      ? [...reachable].sort((a, b) => a.monthsToGoal - b.monthsToGoal || b.confidence - a.confidence)[0]
      : forecasts[0];
    const baselineForecast = forecasts[0];

    const result = {
      goal: {
        id: goal.goal_id,
        title: goal.title,
        current_amount: currentAmount,
        target_amount: targetAmount,
        remaining: Math.max(0, targetAmount - currentAmount),
        progress_percent: targetAmount > 0 ? Math.round((currentAmount / targetAmount) * 100) : 0,
      },
      scenarios: forecasts,
      optimalStrategy: optimalScenario?.name || null,
      summary: buildSummary({
        currentAmount,
        targetAmount,
        optimalScenario,
        baselineScenario: baselineForecast,
        scenariosCount: scenariosResult.rows.length,
      }),
      calculated_at: new Date().toISOString(),
    };

    await this.saveForecast(goalId, result).catch((error) => {
      console.warn(`Не удалось сохранить прогноз: ${error.message}`);
    });
    return result;
  }

  async saveForecast(goalId, calculation) {
    const optimal = calculation.scenarios.find(
      (scenario) => scenario.name === calculation.optimalStrategy
    );
    if (!optimal || optimal.monthsToGoal === null || !optimal.predictedDate) return null;

    const result = await pool.query(
      `INSERT INTO forecasts
       (goal_id, scenario_id, forecast_date, predicted_finish_date, remaining_months, current_amount, target_amount, final_amount)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        goalId,
        optimal.isBaseline ? null : optimal.id,
        new Date().toISOString().split('T')[0],
        optimal.predictedDate,
        optimal.monthsToGoal,
        calculation.goal.current_amount,
        calculation.goal.target_amount,
        optimal.finalAmount,
      ]
    );
    return result.rows[0];
  }

  async getLastForecast(goalId, userId) {
    const goalCheck = await pool.query(
      'SELECT goal_id FROM goals WHERE goal_id = $1 AND user_id = $2',
      [goalId, userId]
    );
    if (goalCheck.rows.length === 0) return null;

    const result = await pool.query(
      `SELECT * FROM forecasts WHERE goal_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [goalId]
    );
    return result.rows[0] || null;
  }
}

module.exports = new ForecastService();
