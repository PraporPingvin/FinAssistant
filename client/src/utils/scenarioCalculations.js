export function getGoalCurrentAmount(goal, payments = null) {
  if (!Array.isArray(payments)) {
    return Number(goal?.current_amount || goal?.initial_amount || 0);
  }

  const initialAmount = Number(goal?.initial_amount || 0);
  const paymentsAmount = payments.reduce(
    (sum, payment) => sum + Number(payment.amount || 0),
    0
  );
  return initialAmount + paymentsAmount;
}

export function calculateRealAnnualReturn(expectedReturn, inflation) {
  const nominalFactor = 1 + Number(expectedReturn || 0) / 100;
  const inflationFactor = 1 + Number(inflation || 0) / 100;

  if (inflationFactor <= 0) return -99;
  return (nominalFactor / inflationFactor - 1) * 100;
}

export function formatPercent(value, maximumFractionDigits = 1) {
  const number = Number(value || 0);
  return new Intl.NumberFormat("ru-RU", {
    maximumFractionDigits,
    minimumFractionDigits: 0,
  }).format(Number.isFinite(number) ? number : 0);
}

export function calculateScenarioMetrics({ goal, scenario, payments = null }) {
  const target = Number(scenario?.target_amount || goal?.target_amount || 0);
  const current = Math.min(target, getGoalCurrentAmount(goal, payments));
  const monthly = Number(
    scenario?.monthly_contribution ?? goal?.monthly_contribution ?? 0
  );
  const expectedReturn = Number(scenario?.expected_return || 0);
  const inflation = Number(scenario?.inflation_rate || 0);
  const effectiveReturn = calculateRealAnnualReturn(expectedReturn, inflation);
  const remaining = Math.max(0, target - current);
  const monthlyRate = calculateMonthlyRate(effectiveReturn);
  const monthsToGoal = calculateMonthsToGoal({ current, target, monthly, monthlyRate });
  const risk = calculateRiskLevel(expectedReturn);
  const probability = calculateProbability({ monthsToGoal, effectiveReturn, riskScore: risk.score });
  const monthlyLoad = Math.min(100, Math.round((monthly / 50000) * 100));
  const rating = calculateRating({ monthsToGoal, probability, riskScore: risk.score, effectiveReturn, monthlyLoad });

  return {
    current,
    target,
    monthly,
    remaining,
    expectedReturn,
    inflation,
    effectiveReturn,
    monthlyRate,
    monthsToGoal,
    probability,
    monthlyLoad,
    rating,
    risk,
  };
}

export function calculateRiskLevel(expectedReturn) {
  const value = Number(expectedReturn || 0);
  if (value < 5) return { level: "Низкий", label: "Низкий", score: 1, className: "low" };
  if (value < 10) return { level: "Средний", label: "Средний", score: 2, className: "medium" };
  return { level: "Высокий", label: "Высокий", score: 3, className: "high" };
}

export function calculateMonthlyRate(annualRate) {
  const value = Number(annualRate || 0);
  if (value <= -99) return -0.99;
  return Math.pow(1 + value / 100, 1 / 12) - 1;
}

function calculateMonthsToGoal({ current, target, monthly, monthlyRate }) {
  if (target <= current) return 0;
  if (monthly <= 0 && monthlyRate <= 0) return Infinity;

  let balance = current;
  for (let month = 1; month <= 1200; month += 1) {
    balance = balance * (1 + monthlyRate) + monthly;
    if (balance >= target) return month;
  }

  return Infinity;
}

function calculateProbability({ monthsToGoal, effectiveReturn, riskScore }) {
  if (!Number.isFinite(monthsToGoal)) return 20;
  const timeScore = Math.max(0, 100 - Math.max(0, monthsToGoal - 24));
  const returnScore = Math.max(-15, Math.min(15, effectiveReturn * 2));
  const riskPenalty = (riskScore - 1) * 8;
  return Math.max(25, Math.min(98, Math.round(timeScore + returnScore - riskPenalty)));
}

function calculateRating({ monthsToGoal, probability, riskScore, effectiveReturn, monthlyLoad }) {
  const timeScore = Number.isFinite(monthsToGoal) ? Math.max(8, 35 - monthsToGoal / 3) : 5;
  return Math.min(100, Math.round(
    timeScore +
    probability * 0.28 +
    (4 - riskScore) * 7 +
    Math.max(0, effectiveReturn) * 2 +
    Math.max(0, 12 - monthlyLoad / 8)
  ));
}
