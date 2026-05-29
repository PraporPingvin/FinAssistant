import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Target,
  TrendingUp,
  DollarSign,
  Calendar,
  Eye,
  BarChart3,
  Clock,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  PieChart,
  CheckCircle,
  Timer,
  ChartNoAxesCombined,
  Plus,
  Sparkles,
} from "lucide-react";
import { getGoals, getScenarios } from "../../../api/api";
import "./CheckpointsForecast.css";

function CheckpointsForecast() {
  const navigate = useNavigate();
  const [goals, setGoals] = useState([]);
  const [scenariosMap, setScenariosMap] = useState({});
  const [forecastsMap, setForecastsMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [expandedForecast, setExpandedForecast] = useState(null);
  const [showCharts, setShowCharts] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const goalsData = await getGoals();
      setGoals(goalsData);
      
      const scenariosTemp = {};
      const forecastsTemp = {};
      
      for (const goal of goalsData) {
        try {
          const scenarios = await getScenarios(goal.goal_id);
          scenariosTemp[goal.goal_id] = scenarios || [];
          forecastsTemp[goal.goal_id] = calculateGoalForecast(goal, scenarios || []);
        } catch (error) {
          console.error(`Ошибка загрузки сценариев для цели ${goal.goal_id}:`, error);
          scenariosTemp[goal.goal_id] = [];
        }
      }
      
      setScenariosMap(scenariosTemp);
      setForecastsMap(forecastsTemp);
    } catch (error) {
      console.error("Ошибка загрузки:", error);
    } finally {
      setLoading(false);
    }
  };

  const calculateGoalForecast = (goal, scenarios) => {
    const currentAmount = parseFloat(goal.current_amount || 0);
    const targetAmount = parseFloat(goal.target_amount);
    const remainingAmount = targetAmount - currentAmount;
    
    if (remainingAmount <= 0) {
      return { achieved: true, progress: 100 };
    }
    
    const forecasts = scenarios.map(scenario => {
      const monthlyContribution = parseFloat(scenario.monthly_contribution);
      const expectedReturn = parseFloat(scenario.expected_return) / 100;
      const monthlyReturn = expectedReturn / 12;
      
      let monthsToGoal = 0;
      let runningAmount = currentAmount;
      
      while (runningAmount < targetAmount && monthsToGoal < 1200) {
        runningAmount += monthlyContribution;
        runningAmount *= (1 + monthlyReturn);
        monthsToGoal++;
      }
      
      const predictedDate = new Date();
      predictedDate.setMonth(predictedDate.getMonth() + monthsToGoal);
      
      return {
        scenarioName: scenario.name,
        monthsToGoal,
        predictedDate: predictedDate.toLocaleDateString('ru-RU'),
        monthlyContribution,
        expectedReturn: expectedReturn * 100,
        isAchievable: monthsToGoal < 1200
      };
    });
    
    const fastest = forecasts.filter(f => f.isAchievable)
      .sort((a, b) => a.monthsToGoal - b.monthsToGoal)[0];
    
    return {
      achieved: false,
      remainingAmount,
      progress: Math.round((currentAmount / targetAmount) * 100),
      fastest,
      scenariosCount: scenarios.length,
      targetDate: fastest?.predictedDate,
      monthsRemaining: fastest?.monthsToGoal
    };
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('ru-RU').format(amount || 0);
  };

  if (loading) {
    return (
      <div className="forecastLoading">
        <div className="loadingSpinner" />
        <p>Загрузка прогнозов...</p>
      </div>
    );
  }

  const goalsWithForecast = goals.filter(g => forecastsMap[g.goal_id]);

  if (goalsWithForecast.length === 0) {
    return (
      <div className="forecastEmpty">
        <div className="emptyIcon">
          <Sparkles size={48} />
        </div>
        <h3>Нет данных для прогнозов</h3>
        <p>Создайте цели и сценарии для получения прогнозов</p>
        <button className="createButton" onClick={() => navigate("/goals/new")}>
          <Plus size={16} />
          Создать цель
        </button>
      </div>
    );
  }

  const stats = {
    totalGoals: goalsWithForecast.length,
    achievedGoals: goals.filter(g => forecastsMap[g.goal_id]?.achieved).length,
    avgMonths: Math.round(goalsWithForecast.reduce((sum, g) => 
      sum + (forecastsMap[g.goal_id]?.monthsRemaining || 0), 0) / goalsWithForecast.length),
    avgProgress: Math.round(goalsWithForecast.reduce((sum, g) => 
      sum + (forecastsMap[g.goal_id]?.progress || 0), 0) / goalsWithForecast.length)
  };

  return (
    <div className="checkpointsForecastPage">
      <div className="forecastSummary">
        <div className="summaryCardCheckpoint">
          <div className="summaryIcon">
            <Target size={28} />
          </div>
          <div className="summaryContent">
            <div className="summaryLabel">Целей с прогнозом</div>
            <div className="summaryValue">{stats.totalGoals}</div>
          </div>
        </div>
        <div className="summaryCardCheckpoint">
          <div className="summaryIcon">
            <CheckCircle size={28} />
          </div>
          <div className="summaryContent">
            <div className="summaryLabel">Достигнуто целей</div>
            <div className="summaryValue">{stats.achievedGoals}</div>
          </div>
        </div>
        <div className="summaryCardCheckpoint">
          <div className="summaryIcon">
            <Timer size={28} />
          </div>
          <div className="summaryContent">
            <div className="summaryLabel">Средний срок</div>
            <div className="summaryValue">{stats.avgMonths} мес.</div>
          </div>
        </div>
        <div className="summaryCardCheckpoint">
          <div className="summaryIcon">
            <ChartNoAxesCombined size={28} />
          </div>
          <div className="summaryContent">
            <div className="summaryLabel">Средний прогресс</div>
            <div className="summaryValue highlight">{stats.avgProgress}%</div>
          </div>
        </div>
      </div>

      {showCharts && (
        <div className="chartsSection">
          <div className="chartsHeader">
            <h3><BarChart3 size={16} /> Аналитика прогнозов</h3>
            <button className="toggleCharts" onClick={() => setShowCharts(false)}>Скрыть</button>
          </div>
          <div className="chartsGrid">
            <div className="chartCardCheckpointF">
              <h4>Распределение по прогрессу</h4>
              <div className="simpleChart">
                <div style={{ "--bar": `${goalsWithForecast.length ? (goalsWithForecast.filter(g => forecastsMap[g.goal_id]?.progress < 25).length / goalsWithForecast.length) * 100 : 0}%` }}><span>0-25%</span><strong>{goalsWithForecast.filter(g => forecastsMap[g.goal_id]?.progress < 25).length}</strong></div>
                <div style={{ "--bar": `${goalsWithForecast.length ? (goalsWithForecast.filter(g => forecastsMap[g.goal_id]?.progress >= 25 && forecastsMap[g.goal_id]?.progress < 50).length / goalsWithForecast.length) * 100 : 0}%` }}><span>26-50%</span><strong>{goalsWithForecast.filter(g => forecastsMap[g.goal_id]?.progress >= 25 && forecastsMap[g.goal_id]?.progress < 50).length}</strong></div>
                <div style={{ "--bar": `${goalsWithForecast.length ? (goalsWithForecast.filter(g => forecastsMap[g.goal_id]?.progress >= 50 && forecastsMap[g.goal_id]?.progress < 75).length / goalsWithForecast.length) * 100 : 0}%` }}><span>51-75%</span><strong>{goalsWithForecast.filter(g => forecastsMap[g.goal_id]?.progress >= 50 && forecastsMap[g.goal_id]?.progress < 75).length}</strong></div>
                <div style={{ "--bar": `${goalsWithForecast.length ? (goalsWithForecast.filter(g => forecastsMap[g.goal_id]?.progress >= 75 && forecastsMap[g.goal_id]?.progress < 100).length / goalsWithForecast.length) * 100 : 0}%` }}><span>76-99%</span><strong>{goalsWithForecast.filter(g => forecastsMap[g.goal_id]?.progress >= 75 && forecastsMap[g.goal_id]?.progress < 100).length}</strong></div>
                <div style={{ "--bar": `${goalsWithForecast.length ? (stats.achievedGoals / goalsWithForecast.length) * 100 : 0}%` }}><span>100%</span><strong>{stats.achievedGoals}</strong></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {!showCharts && (
        <button className="showChartsButton" onClick={() => setShowCharts(true)}>
          <BarChart3 size={14} /> Показать графики
        </button>
      )}

      <div className="forecastTableSection">
        <h3><PieChart size={16} /> Детальные прогнозы по целям</h3>
        <div className="tableContainer">
          <table className="forecastTable">
            <thead>
              <tr>
                <th>Цель</th>
                <th>Прогресс</th>
                <th>Осталось</th>
                <th>Сценариев</th>
                <th>Оптимальный срок</th>
                <th>Прогнозируемая дата</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              {goalsWithForecast.map(goal => {
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
                    <td>{forecast.monthsRemaining ? `${forecast.monthsRemaining} мес.` : "—"}</td>
                    <td>{forecast.targetDate || "—"}</td>
                    <td className="tableActions">
                      <button className="tableAction view" onClick={() => navigate(`/goals/${goal.goal_id}`)} title="Детали">
                        <Eye size={14} />
                      </button>
                      <button className="tableAction scenarios" onClick={() => navigate(`/scenarios/${goal.goal_id}`)} title="Сценарии">
                        <BarChart3 size={14} />
                      </button>
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
