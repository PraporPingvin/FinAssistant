// src/api/api.js
import apiClient from './apiClient';

// ============ ЦЕЛИ (GOALS) ============

// Получить все цели текущего пользователя
export async function getGoals() {
  return apiClient.get('/goals');
}

// Получить конкретную цель
export async function getGoal(goalId) {
  return apiClient.get(`/goals/${goalId}`);
}

// Алиас для обратной совместимости
export async function getGoalById(goalId) {
  return getGoal(goalId);
}

// Создать новую цель
export async function createGoal(goalData) {
  return apiClient.post('/goals', goalData);
}

// Обновить цель
export async function updateGoal(goalId, goalData) {
  return apiClient.patch(`/goals/${goalId}`, goalData);
}

// Удалить цель
export async function deleteGoal(goalId) {
  return apiClient.delete(`/goals/${goalId}`);
}

// ============ СЦЕНАРИИ (SCENARIOS) ============

// Получить сценарии для цели
export async function getScenarios(goalId) {
  return apiClient.get(`/scenarios/${goalId}`);
}

// Получить сценарий по ID
export async function getScenario(scenarioId) {
  return apiClient.get(`/scenarios/scenario/${scenarioId}`);
}

// Алиас для обратной совместимости
export async function getScenarioById(scenarioId) {
  return getScenario(scenarioId);
}

// Создать сценарий
export async function createScenario(scenarioData) {
  return apiClient.post('/scenarios', scenarioData);
}

// Обновить сценарий
export async function updateScenario(scenarioId, scenarioData) {
  return apiClient.patch(`/scenarios/${scenarioId}`, scenarioData);
}

// Удалить сценарий
export async function deleteScenario(scenarioId) {
  return apiClient.delete(`/scenarios/${scenarioId}`);
}

// ============ ПЛАТЕЖИ (PAYMENTS) ============

// Получить платежи для цели
export async function getPayments(goalId) {
  return apiClient.get(`/payments/${goalId}`);
}

// Добавить платеж
export async function createPayment(paymentData) {
  return apiClient.post('/payments', paymentData);
}

// Обновить платеж
export async function updatePayment(paymentId, paymentData) {
  return apiClient.patch(`/payments/${paymentId}`, paymentData);
}

// Удалить платеж
export async function deletePayment(paymentId) {
  return apiClient.delete(`/payments/${paymentId}`);
}

// Получить конкретный платеж
export async function getPayment(paymentId) {
  return apiClient.get(`/payments/payment/${paymentId}`);
}

// ============ КОНТРОЛЬНЫЕ ТОЧКИ (CHECKPOINTS) ============

// Получить все контрольные точки пользователя
export async function getCheckpoints(userId) {
  // userId теперь не обязателен, сервер возьмет из токена
  return apiClient.get('/checkpoints');
}

// Получить контрольные точки для конкретной цели
export async function getCheckpointsByGoal(goalId) {
  return apiClient.get(`/checkpoints/goal/${goalId}`);
}

// Получить контрольную точку по ID
export async function getCheckpoint(checkpointId) {
  return apiClient.get(`/checkpoints/${checkpointId}`);
}

// Создать контрольную точку
export async function createCheckpoint(checkpointData) {
  return apiClient.post('/checkpoints', checkpointData);
}

// Обновить контрольную точку
export async function updateCheckpoint(checkpointId, checkpointData) {
  return apiClient.patch(`/checkpoints/${checkpointId}`, checkpointData);
}

// Удалить контрольную точку
export async function deleteCheckpoint(checkpointId) {
  return apiClient.delete(`/checkpoints/${checkpointId}`);
}

// ============ ПРОГНОЗЫ (FORECASTS) ============

// Получить прогноз (последний сохранённый)
export async function getForecast(goalId) {
    return apiClient.get(`/forecast/${goalId}`);
}

// Рассчитать новый прогноз (без сохранения)
export async function calculateForecast(goalId, scenarioId = null) {
    return apiClient.post(`/forecast/calculate/${goalId}`, { scenarioId });
}

// Рассчитать и сохранить прогноз
export async function createForecast(goalId, scenarioId = null) {
    return apiClient.post(`/forecast/${goalId}`, { scenarioId });
}

// Сравнить прогнозы по разным сценариям
export async function compareForecasts(goalId) {
    return apiClient.get(`/forecast/compare/${goalId}`);
}

// Удалить прогноз
export async function deleteForecast(forecastId) {
    return apiClient.delete(`/forecast/${forecastId}`);
}

// ============ СТАТИСТИКА ============

// Получить статистику пользователя
export async function getUserStats() {
  return apiClient.get('/user/stats');
}

// ============ ECONOMIC DATA ============

export async function getRussiaInflation() {
  return apiClient.get('/economic/inflation/russia');
}
