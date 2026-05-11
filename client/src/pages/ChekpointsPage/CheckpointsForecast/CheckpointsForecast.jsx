// client/src/pages/CheckpointsPage/CheckpointsForecast.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getGoals, getScenarios } from "../../../api/api";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import "./CheckpointsForecast.css";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

function CheckpointsForecast() {
  const navigate = useNavigate();
  const [goals, setGoals] = useState([]);
  const [scenariosMap, setScenariosMap] = useState({});
  const [forecastsMap, setForecastsMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [expandedForecast, setExpandedForecast] = useState(null);
  const [showCharts, setShowCharts] = useState(true);
  const [selectedGoalForChart, setSelectedGoalForChart] = useState("all");

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

  // Данные для графиков
  const getForecastComparisonData = () => {
    const goalsWithForecast = goals.filter(g => forecastsMap[g.goal_id] && !forecastsMap[g.goal_id].achieved);
    
    return {
      labels: goalsWithForecast.map(g => g.title.length > 20 ? g.title.substring(0, 20) + '...' : g.title),
      datasets: [
        {
          label: 'Прогнозируемый срок (мес.)',
          data: goalsWithForecast.map(g => forecastsMap[g.goal_id]?.monthsRemaining || 0),
          backgroundColor: 'rgba(73, 86, 49, 0.7)',
          borderColor: '#495631',
          borderWidth: 1
        },
        {
          label: 'Текущий прогресс (%)',
          data: goalsWithForecast.map(g => forecastsMap[g.goal_id]?.progress || 0),
          backgroundColor: 'rgba(33, 150, 243, 0.7)',
          borderColor: '#2196f3',
          borderWidth: 1
        }
      ]
    };
  };

  const getProgressDistributionData = () => {
    const progressRanges = {
      '0-25%': 0,
      '26-50%': 0,
      '51-75%': 0,
      '76-99%': 0,
      '100%': 0
    };

    goals.forEach(goal => {
      const progress = forecastsMap[goal.goal_id]?.progress || 0;
      if (progress === 100) progressRanges['100%']++;
      else if (progress >= 76) progressRanges['76-99%']++;
      else if (progress >= 51) progressRanges['51-75%']++;
      else if (progress >= 26) progressRanges['26-50%']++;
      else progressRanges['0-25%']++;
    });

    return {
      labels: Object.keys(progressRanges),
      datasets: [{
        data: Object.values(progressRanges),
        backgroundColor: ['#f44336', '#ff9800', '#2196f3', '#4caf50', '#9c27b0'],
        borderWidth: 1
      }]
    };
  };

  const timelineForecastData = () => {
    const months = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];
    const currentYear = new Date().getFullYear();
    
    return {
      labels: months.map(m => `${m} ${currentYear}`),
      datasets: goals.slice(0, 5).map((goal, index) => ({
        label: goal.title.length > 15 ? goal.title.substring(0, 15) + '...' : goal.title,
        data: months.map((_, i) => {
          const forecast = forecastsMap[goal.goal_id];
          if (!forecast || forecast.achieved) return null;
          const progress = forecast.progress;
          const monthlyIncrease = 100 / (forecast.monthsRemaining || 12);
          return Math.min(100, progress + (i * monthlyIncrease));
        }),
        borderColor: `hsl(${index * 60}, 70%, 50%)`,
        backgroundColor: 'transparent',
        tension: 0.4,
        pointRadius: 3
      }))
    };
  };

  if (loading) {
    return (
      <div className="forecast-loading">
        <div className="loading-spinner"></div>
        <p>Загрузка прогнозов...</p>
      </div>
    );
  }

  const goalsWithForecast = goals.filter(g => forecastsMap[g.goal_id]);
  const forecastComparisonData = getForecastComparisonData();
  const progressDistributionData = getProgressDistributionData();
  const timelineData = timelineForecastData();

  if (goalsWithForecast.length === 0) {
    return (
      <div className="forecast-empty">
        <div className="empty-icon">🔮</div>
        <h3>Нет данных для прогнозов</h3>
        <p>Создайте цели и сценарии для получения прогнозов</p>
        <button 
          className="create-button"
          onClick={() => navigate("/goals/new")}
        >
          Создать цель
        </button>
      </div>
    );
  }

  return (
    <div className="forecast-page">
      {/* Общая статистика прогнозов */}
      <div className="forecast-summary">
        <div className="summary-card">
          <div className="summary-icon">🎯</div>
          <div className="summary-content">
            <div className="summary-label">Целей с прогнозом</div>
            <div className="summary-value">{goalsWithForecast.length}</div>
          </div>
        </div>
        <div className="summary-card">
          <div className="summary-icon">✅</div>
          <div className="summary-content">
            <div className="summary-label">Достигнуто целей</div>
            <div className="summary-value">{goals.filter(g => forecastsMap[g.goal_id]?.achieved).length}</div>
          </div>
        </div>
        <div className="summary-card">
          <div className="summary-icon">⏱️</div>
          <div className="summary-content">
            <div className="summary-label">Средний срок</div>
            <div className="summary-value">
              {Math.round(goalsWithForecast.reduce((sum, g) => 
                sum + (forecastsMap[g.goal_id]?.monthsRemaining || 0), 0) / goalsWithForecast.length)} мес.
            </div>
          </div>
        </div>
        <div className="summary-card">
          <div className="summary-icon">📊</div>
          <div className="summary-content">
            <div className="summary-label">Средний прогресс</div>
            <div className="summary-value highlight">
              {Math.round(goalsWithForecast.reduce((sum, g) => 
                sum + (forecastsMap[g.goal_id]?.progress || 0), 0) / goalsWithForecast.length)}%
            </div>
          </div>
        </div>
      </div>

      {/* Графики */}
      {showCharts && (
        <div className="charts-section">
          <div className="charts-header">
            <h3>📊 Аналитика прогнозов</h3>
            {/* <div className="chart-controls">
              <select 
                value={selectedGoalForChart}
                onChange={(e) => setSelectedGoalForChart(e.target.value)}
                className="chart-select"
              >
                <option value="all">Все цели</option>
                {goalsWithForecast.map(goal => (
                  <option key={goal.goal_id} value={goal.goal_id}>
                    {goal.title}
                  </option>
                ))}
              </select>
              <button 
                className="toggle-charts"
                onClick={() => setShowCharts(false)}
              >
                Скрыть
              </button>
            </div> */}
          </div>

          <div className="charts-grid">
            <div className="chart-card">
              <h4>Распределение по прогрессу</h4>
              <div className="chart-container">
                <Bar data={progressDistributionData} options={{
                  plugins: {
                    legend: { display: false },
                    tooltip: {
                      callbacks: {
                        label: (context) => {
                          return `${context.raw} целей`;
                        }
                      }
                    }
                  },
                  scales: {
                    y: {
                      beginAtZero: true,
                      ticks: {
                        stepSize: 1
                      }
                    }
                  }
                }} />
              </div>
            </div>

            <div className="chart-card">
              <h4>Сравнение прогнозов</h4>
              <div className="chart-container">
                <Bar data={forecastComparisonData} options={{
                  plugins: {
                    legend: { position: 'top' },
                    tooltip: {
                      callbacks: {
                        label: (context) => {
                          if (context.dataset.label.includes('срок')) {
                            return `${context.raw} месяцев`;
                          } else {
                            return `${context.raw}%`;
                          }
                        }
                      }
                    }
                  },
                  scales: {
                    y: {
                      beginAtZero: true
                    }
                  }
                }} />
              </div>
            </div>

            <div className="chart-card full-width">
              <h4>Прогноз достижения целей (временная шкала)</h4>
              <div className="chart-container" style={{ height: '400px' }}>
                <Line data={timelineData} options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { position: 'top' },
                    tooltip: {
                      callbacks: {
                        label: (context) => {
                          return `${context.dataset.label}: ${Math.round(context.raw)}%`;
                        }
                      }
                    }
                  },
                  scales: {
                    y: {
                      beginAtZero: true,
                      max: 100,
                      title: {
                        display: true,
                        text: 'Прогресс (%)'
                      }
                    }
                  }
                }} />
              </div>
            </div>
          </div>
        </div>
      )}

      {!showCharts && (
        <button 
          className="show-charts-button"
          onClick={() => setShowCharts(true)}
        >
          📊 Показать графики
        </button>
      )}

      {/* Таблица прогнозов */}
      <div className="forecast-table-section">
        <h3>📋 Детальные прогнозы по целям</h3>
        <div className="table-container">
          <table className="forecast-table">
            <thead>
              <tr>
                <th>Цель</th>
                <th>Прогресс</th>
                <th>Осталось накопить</th>
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
                    <td>
                      <strong>{goal.title}</strong>
                    </td>
                    <td>
                      <div className="table-progress">
                        <div className="table-progress-bar">
                          <div 
                            className="table-progress-fill"
                            style={{ width: `${forecast.progress}%` }}
                          />
                        </div>
                        <span className="table-progress-text">{forecast.progress}%</span>
                      </div>
                    </td>
                    <td className="amount-cell">
                      {formatCurrency(forecast.remainingAmount)} ₽
                    </td>
                    <td className="center-cell">
                      <span className="scenarios-count">{forecast.scenariosCount}</span>
                    </td>
                    <td>
                      {forecast.fastest ? (
                        <span className="months-badge">
                          {forecast.monthsRemaining} мес.
                        </span>
                      ) : (
                        <span className="no-data">—</span>
                      )}
                    </td>
                    <td>
                      {forecast.targetDate || '—'}
                    </td>
                    <td className="table-actions">
                      <button 
                        className="table-action view"
                        onClick={() => navigate(`/goals/${goal.goal_id}`)}
                        title="Детали цели"
                      >
                        👁️
                      </button>
                      <button 
                        className="table-action scenarios"
                        onClick={() => navigate(`/scenarios/${goal.goal_id}`)}
                        title="Сценарии"
                      >
                        📈
                      </button>
                      <button 
                        className="table-action forecast"
                        onClick={() => navigate(`/forecast/${goal.goal_id}`)}
                        title="Детальный прогноз"
                      >
                        🔮
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Детальные карточки прогнозов (как было) */}
      {/* <div className="forecast-grid">
        {goalsWithForecast.map(goal => {
          const forecast = forecastsMap[goal.goal_id];
          const isExpanded = expandedForecast === goal.goal_id;
          
          return (
            <div key={goal.goal_id} className="forecast-card">
              <div 
                className="forecast-card-header"
                onClick={() => setExpandedForecast(isExpanded ? null : goal.goal_id)}
              >
                <div className="forecast-title-section">
                  <h3 className="forecast-title">{goal.title}</h3>
                  <span className="forecast-progress">{forecast.progress}%</span>
                </div>
                
                <div className="forecast-status">
                  {forecast.achieved ? (
                    <span className="achieved-badge">✅ Достигнута</span>
                  ) : forecast.fastest ? (
                    <span className="forecast-badge">
                      ~{forecast.monthsRemaining} мес.
                    </span>
                  ) : (
                    <span className="forecast-badge warning">
                      Нет прогноза
                    </span>
                  )}
                  <span className="expand-icon">{isExpanded ? "▼" : "▶"}</span>
                </div>
              </div>

              <div className="forecast-progress-bar">
                <div 
                  className="progress-fill"
                  style={{ width: `${forecast.progress}%` }}
                />
              </div>

              {isExpanded && forecast.fastest && (
                <div className="forecast-details">
                  <div className="fastest-scenario">
                    <h4>⚡ Самый быстрый сценарий</h4>
                    <div className="scenario-detail">
                      <span className="scenario-name">{forecast.fastest.scenarioName}</span>
                      <div className="scenario-metrics">
                        <div className="metric">
                          <span className="metric-label">Срок:</span>
                          <span className="metric-value">{forecast.fastest.monthsToGoal} мес.</span>
                        </div>
                        <div className="metric">
                          <span className="metric-label">Дата:</span>
                          <span className="metric-value">{forecast.fastest.predictedDate}</span>
                        </div>
                        <div className="metric">
                          <span className="metric-label">Взнос:</span>
                          <span className="metric-value">{formatCurrency(forecast.fastest.monthlyContribution)} ₽</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="forecast-stats">
                    <div className="stat">
                      <span className="stat-label">Осталось накопить:</span>
                      <span className="stat-value">{formatCurrency(forecast.remainingAmount)} ₽</span>
                    </div>
                    <div className="stat">
                      <span className="stat-label">Сценариев:</span>
                      <span className="stat-value">{forecast.scenariosCount}</span>
                    </div>
                  </div>

                  <div className="forecast-actions">
                    <button 
                      className="action-button"
                      onClick={() => navigate(`/scenarios/${goal.goal_id}`)}
                    >
                      📈 Все сценарии
                    </button>
                    <button 
                      className="action-button primary"
                      onClick={() => navigate(`/forecast/${goal.goal_id}`)}
                    >
                      📊 Детальный прогноз
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div> */}
    </div>
  );
}

export default CheckpointsForecast;