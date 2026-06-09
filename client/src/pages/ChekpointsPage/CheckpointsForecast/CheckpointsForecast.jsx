import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Target, BarChart3, Eye, PieChart, CheckCircle, Timer,
  ChartNoAxesCombined, Plus, Sparkles,
} from "lucide-react";
import { getGoals, getScenarios } from "../../../api/api";
import { calculateScenarioMetrics } from "../../../utils/scenarioCalculations";
import "./CheckpointsForecast.css";

const formatCurrency = (amount) => new Intl.NumberFormat("ru-RU").format(amount || 0);

function buildForecast(goal, scenarios) {
  const baseline = {
    name: "План цели",
    monthly_contribution: goal.monthly_contribution,
    expected_return: 0,
    inflation_rate: 0,
  };
  const variants = [baseline, ...scenarios].map((scenario) => ({
    name: scenario.name,
    ...calculateScenarioMetrics({ goal, scenario }),
  }));
  const fastest = variants
    .filter((variant) => Number.isFinite(variant.monthsToGoal))
    .sort((a, b) => a.monthsToGoal - b.monthsToGoal)[0] || null;
  const targetDate = fastest ? new Date() : null;
  if (targetDate) targetDate.setMonth(targetDate.getMonth() + fastest.monthsToGoal);
  const base = variants[0];

  return {
    achieved: base.remaining <= 0,
    remainingAmount: base.remaining,
    progress: base.target > 0 ? Math.min(100, Math.round((base.current / base.target) * 100)) : 0,
    scenariosCount: scenarios.length,
    fastest,
    monthsRemaining: fastest?.monthsToGoal ?? null,
    targetDate: targetDate?.toLocaleDateString("ru-RU") ?? null,
  };
}

function CheckpointsForecast() {
  const navigate = useNavigate();
  const [goals, setGoals] = useState([]);
  const [forecastsMap, setForecastsMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [showCharts, setShowCharts] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const goalsData = await getGoals();
        const scenarioLists = await Promise.all(
          goalsData.map((goal) => getScenarios(goal.goal_id).catch(() => []))
        );
        setGoals(goalsData);
        setForecastsMap(Object.fromEntries(
          goalsData.map((goal, index) => [
            goal.goal_id,
            buildForecast(goal, scenarioLists[index] || []),
          ])
        ));
      } catch (error) {
        console.error("Ошибка загрузки прогнозов:", error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  if (loading) {
    return <div className="forecastLoading"><div className="loadingSpinner" /><p>Загрузка прогнозов...</p></div>;
  }

  if (goals.length === 0) {
    return (
      <div className="forecastEmpty">
        <div className="emptyIcon"><Sparkles size={48} /></div>
        <h3>Нет целей для прогноза</h3>
        <p>Создайте цель, и здесь появится базовый прогноз даже без сценариев.</p>
        <button className="createButton" onClick={() => navigate("/goals/new")}>
          <Plus size={16} /> Создать цель
        </button>
      </div>
    );
  }

  const stats = {
    totalGoals: goals.length,
    achievedGoals: goals.filter((goal) => forecastsMap[goal.goal_id]?.achieved).length,
    avgMonths: Math.round(goals.reduce(
      (sum, goal) => sum + (forecastsMap[goal.goal_id]?.monthsRemaining || 0), 0
    ) / goals.length),
    avgProgress: Math.round(goals.reduce(
      (sum, goal) => sum + (forecastsMap[goal.goal_id]?.progress || 0), 0
    ) / goals.length),
  };

  return (
    <div className="checkpointsForecastPage">
      <div className="forecastSummary">
        {[
          [Target, "Целей с прогнозом", stats.totalGoals],
          [CheckCircle, "Достигнуто целей", stats.achievedGoals],
          [Timer, "Средний срок", `${stats.avgMonths} мес.`],
          [ChartNoAxesCombined, "Средний прогресс", `${stats.avgProgress}%`],
        ].map(([Icon, label, value]) => (
          <div className="summaryCardCheckpoint" key={label}>
            <div className="summaryIcon"><Icon size={28} /></div>
            <div className="summaryContent">
              <div className="summaryLabel">{label}</div>
              <div className="summaryValue">{value}</div>
            </div>
          </div>
        ))}
      </div>

      {showCharts ? (
        <div className="chartsSection">
          <div className="chartsHeader">
            <h3><BarChart3 size={16} /> Распределение целей по прогрессу</h3>
            <button className="toggleCharts" onClick={() => setShowCharts(false)}>Скрыть</button>
          </div>
          <div className="chartsGrid">
            <div className="chartCardCheckpointF">
              <div className="simpleChart">
                {[[0, 25], [25, 50], [50, 75], [75, 101]].map(([from, to]) => {
                  const count = goals.filter((goal) => {
                    const progress = forecastsMap[goal.goal_id]?.progress || 0;
                    return progress >= from && progress < to;
                  }).length;
                  return (
                    <div key={from} style={{ "--bar": `${(count / goals.length) * 100}%` }}>
                      <span>{from}-{to === 101 ? 100 : to}%</span><strong>{count}</strong>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <button className="showChartsButton" onClick={() => setShowCharts(true)}>
          <BarChart3 size={14} /> Показать график
        </button>
      )}

      <div className="forecastTableSection">
        <h3><PieChart size={16} /> Прогнозы по целям</h3>
        <div className="tableContainer">
          <table className="forecastTable">
            <thead>
              <tr>
                <th>Цель</th><th>Прогресс</th><th>Осталось</th><th>Сценариев</th>
                <th>Лучший план</th><th>Срок</th><th>Действия</th>
              </tr>
            </thead>
            <tbody>
              {goals.map((goal) => {
                const forecast = forecastsMap[goal.goal_id];
                return (
                  <tr key={goal.goal_id}>
                    <td><strong>{goal.title}</strong></td>
                    <td>
                      <div className="tableProgress">
                        <div className="tableProgressBar">
                          <div className="tableProgressFill" style={{ width: `${forecast.progress}%` }} />
                        </div>
                        <span>{forecast.progress}%</span>
                      </div>
                    </td>
                    <td className="amountCell">{formatCurrency(forecast.remainingAmount)} ₽</td>
                    <td className="centerCell"><span className="scenariosCount">{forecast.scenariosCount}</span></td>
                    <td>{forecast.fastest?.name || "Недостижимо при текущем взносе"}</td>
                    <td>{forecast.targetDate || "—"}</td>
                    <td className="tableActions">
                      <button className="tableAction view" onClick={() => navigate(`/goals/${goal.goal_id}`)} title="Открыть цель"><Eye size={14} /></button>
                      <button className="tableAction scenarios" onClick={() => navigate(`/scenarios/${goal.goal_id}`)} title="Открыть сценарии"><BarChart3 size={14} /></button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default CheckpointsForecast;
