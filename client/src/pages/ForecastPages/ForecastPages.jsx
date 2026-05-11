// client/src/pages/ForecastPage/ForecastPage.jsx

import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import Layout from "../../components/Layout";
import { getGoals, getGoal, getScenarios } from "../../api/api";
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
import "./ForecastPage.css";

// Регистрируем компоненты ChartJS
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

function ForecastPage() {
  const { goalId } = useParams();
  const navigate = useNavigate();
  
  const [allGoals, setAllGoals] = useState([]);
  const [goal, setGoal] = useState(null);
  const [scenarios, setScenarios] = useState([]);
  const [forecast, setForecast] = useState(null);
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [error, setError] = useState("");
  const [selectedGoalId, setSelectedGoalId] = useState(goalId || "");
  const [timelineData, setTimelineData] = useState(null);
  const [comparisonData, setComparisonData] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [dataLoaded, setDataLoaded] = useState(false);

  // Загружаем список всех целей при монтировании
  useEffect(() => {
    console.log("🔄 Загружаем список всех целей");
    loadAllGoals();
  }, []);

  // Когда выбран новый ID цели - загружаем её данные
  useEffect(() => {
    if (selectedGoalId) {
      console.log(`🔄 Выбрана цель ID: ${selectedGoalId}, загружаем данные`);
      loadGoalData(selectedGoalId);
    } else {
      setGoal(null);
      setScenarios([]);
      setForecast(null);
      setDataLoaded(false);
    }
  }, [selectedGoalId]);

  // Когда данные цели и сценарии загружены - рассчитываем прогноз
  useEffect(() => {
    if (dataLoaded && goal && scenarios.length > 0) {
      console.log("🧮 Данные загружены, запускаем расчет прогноза");
      calculateForecast();
    } else if (dataLoaded && goal && scenarios.length === 0) {
      console.log("⚠️ Цель загружена, но нет сценариев");
      setCalculating(false);
    }
  }, [dataLoaded, goal, scenarios]);

  const loadAllGoals = async () => {
    try {
      const goalsData = await getGoals(1); // userId = 1 для демо
      console.log(`✅ Загружено ${goalsData.length} целей`);
      setAllGoals(goalsData);
    } catch (error) {
      console.error("❌ Ошибка загрузки списка целей:", error);
      setError("Не удалось загрузить список целей");
    }
  };

  const loadGoalData = async (id) => {
    try {
      setLoading(true);
      setError("");
      setForecast(null);
      setDataLoaded(false);

      console.log(`🔄 Загружаем данные цели ID: ${id}`);
      
      const goalData = await getGoal(id);
      
      if (!goalData) {
        setError("Цель не найдена");
        setLoading(false);
        return;
      }

      console.log(`✅ Цель загружена:`, goalData.title);
      setGoal(goalData);

      console.log(`🔄 Загружаем сценарии для цели ID: ${id}`);
      const scenariosData = await getScenarios(id);
      console.log(`✅ Загружено ${scenariosData.length} сценариев`);
      setScenarios(scenariosData || []);
      
      // Помечаем, что все данные загружены
      setDataLoaded(true);

    } catch (error) {
      console.error("❌ Ошибка загрузки данных:", error);
      setError("Не удалось загрузить данные: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoalSelect = (e) => {
    const newGoalId = e.target.value;
    console.log(`📝 Выбрана цель из селектора: ${newGoalId}`);
    setSelectedGoalId(newGoalId);
    
    if (newGoalId) {
      navigate(`/forecast/${newGoalId}`);
    } else {
      navigate("/forecast");
    }
  };

  /**
   * ОСНОВНАЯ ЛОГИКА РАСЧЕТА ПРОГНОЗА
   */
  const calculateForecast = () => {
    if (!goal) {
      console.error("❌ Нет данных цели для расчета");
      return;
    }
    
    if (scenarios.length === 0) {
      console.error("❌ Нет сценариев для расчета");
      return;
    }

    console.log("🧮 Начинаем расчет прогноза...");
    setCalculating(true);

    const today = new Date();
    const currentAmount = parseFloat(goal.current_amount || 0);
    const targetAmount = parseFloat(goal.target_amount);
    
    console.log(`📊 Текущая сумма: ${currentAmount}, Целевая: ${targetAmount}`);

    // Расчет для каждого сценария
    const scenariosForecast = scenarios.map(scenario => {
      const monthlyContribution = parseFloat(scenario.monthly_contribution);
      const expectedReturn = parseFloat(scenario.expected_return) / 100; // годовая доходность
      const monthlyReturn = expectedReturn / 12; // месячная доходность
      
      let monthsToGoal = 0;
      let runningAmount = currentAmount;
      
      console.log(`  Расчет сценария "${scenario.name}": взнос ${monthlyContribution}, доходность ${expectedReturn*100}%`);
      
      // Симуляция по месяцам до достижения цели
      while (runningAmount < targetAmount && monthsToGoal < 1200) {
        // Добавляем ежемесячный взнос
        runningAmount += monthlyContribution;
        
        // Начисляем проценты (сложный процент)
        runningAmount *= (1 + monthlyReturn);
        
        monthsToGoal++;
        
        // Защита от бесконечного цикла
        if (monthsToGoal > 1200) break;
      }
      
      // Прогнозируемая дата достижения
      const predictedDate = new Date(today);
      predictedDate.setMonth(predictedDate.getMonth() + monthsToGoal);
      
      // Уровень риска на основе доходности
      let risk = 'средний';
      if (expectedReturn > 0.15) risk = 'высокий';
      else if (expectedReturn < 0.05) risk = 'низкий';
      
      // Уверенность в прогнозе
      let confidence = 85;
      if (monthsToGoal > 120) confidence -= 15; // >10 лет
      else if (monthsToGoal > 60) confidence -= 5; // >5 лет
      if (expectedReturn > 0.15) confidence -= 10; // высокорисковые

      return {
        id: scenario.scenario_id,
        name: scenario.name,
        monthlyContribution,
        expectedReturn: expectedReturn * 100,
        inflationRate: scenario.inflation_rate,
        monthsToGoal,
        predictedDate: predictedDate.toISOString().split('T')[0],
        finalAmount: Math.round(runningAmount),
        confidence: Math.max(50, Math.min(99, confidence)),
        risk
      };
    });

    console.log(`✅ Рассчитано ${scenariosForecast.length} сценариев`);

    // Определение оптимальной стратегии (по скорости)
    const optimalBySpeed = [...scenariosForecast].sort((a, b) => a.monthsToGoal - b.monthsToGoal)[0];
    
    // Генерация рекомендаций
    const recommendations = generateRecommendations(goal, scenariosForecast);

    // Анализ рисков
    const risks = analyzeRisks(goal, scenariosForecast);

    const forecastResult = {
      scenarios: scenariosForecast,
      optimalStrategy: optimalBySpeed.name,
      recommendations,
      risks,
      summary: generateSummary(goal, optimalBySpeed, scenariosForecast)
    };

    console.log("📊 Прогноз рассчитан:", forecastResult);
    setForecast(forecastResult);

    // Генерация данных для графиков
    generateTimelineData(scenariosForecast);
    generateComparisonData(scenariosForecast);

    setCalculating(false);
  };

  /**
   * Генерация рекомендаций
   */
  const generateRecommendations = (goal, scenarios) => {
    const recommendations = [];
    const targetAmount = parseFloat(goal.target_amount);
    
    // Самая быстрая стратегия
    const fastest = [...scenarios].sort((a, b) => a.monthsToGoal - b.monthsToGoal)[0];
    recommendations.push({
      text: `Самый быстрый способ: "${fastest.name}" достигнет цели через ${fastest.monthsToGoal} месяцев`,
      impact: 'высокий',
      savings: 0
    });

    // Самая надежная стратегия
    const safest = [...scenarios].filter(s => s.risk === 'низкий')
      .sort((a, b) => a.monthsToGoal - b.monthsToGoal)[0];
    
    if (safest) {
      recommendations.push({
        text: `Самый надежный вариант: "${safest.name}" с низким уровнем риска`,
        impact: 'средний',
        savings: 0
      });
    }

    return recommendations;
  };

  /**
   * Анализ рисков
   */
  const analyzeRisks = (goal, scenarios) => {
    const risks = [];
    
    // Риск инфляции
    risks.push({
      factor: 'Инфляция',
      probability: 85,
      impact: 'Снижение покупательной способности накоплений'
    });

    // Риск длительного срока
    const slowestMonths = Math.max(...scenarios.map(s => s.monthsToGoal));
    if (slowestMonths > 120) {
      risks.push({
        factor: 'Длительный срок',
        probability: 60,
        impact: `Цель может быть не достигнута в течение ${Math.round(slowestMonths/12)} лет`
      });
    }

    return risks;
  };

  /**
   * Генерация резюме
   */
  const generateSummary = (goal, optimalScenario, allScenarios) => {
    const targetAmount = parseFloat(goal.target_amount);
    const currentAmount = parseFloat(goal.current_amount || 0);
    const progress = Math.round((currentAmount / targetAmount) * 100);
    
    const fastestMonths = optimalScenario.monthsToGoal;
    const fastestYears = Math.floor(fastestMonths / 12);
    const fastestRemainingMonths = fastestMonths % 12;
    
    const timeText = fastestYears > 0 
      ? `${fastestYears} г. ${fastestRemainingMonths} мес.` 
      : `${fastestMonths} мес.`;

    return `При текущем прогрессе ${progress}% и оптимальном сценарии "${optimalScenario.name}" цель будет достигнута через ${timeText}. ` +
           `Рассмотрено ${allScenarios.length} различных стратегий.`;
  };

  /**
   * Генерация данных для графика динамики
   */
  const generateTimelineData = (scenariosForecast) => {
    if (!goal || scenariosForecast.length === 0) return;

    const today = new Date();
    const months = [];
    const maxMonths = Math.max(...scenariosForecast.map(s => s.monthsToGoal)) + 6;
    
    for (let i = 0; i <= maxMonths; i += 3) {
      const date = new Date(today);
      date.setMonth(date.getMonth() + i);
      months.push(date.toLocaleDateString('ru-RU', { month: 'short', year: 'numeric' }));
    }

    const datasets = scenariosForecast.map(scenario => {
      const data = [];
      let currentAmount = parseFloat(goal.current_amount || 0);
      const monthlyContribution = scenario.monthlyContribution;
      const monthlyReturn = scenario.expectedReturn / 100 / 12;

      for (let i = 0; i <= maxMonths; i += 3) {
        let simulatedAmount = currentAmount;
        for (let j = 0; j < i; j++) {
          simulatedAmount += monthlyContribution;
          simulatedAmount *= (1 + monthlyReturn);
        }
        data.push(Math.round(simulatedAmount));
      }

      return {
        label: scenario.name,
        data: data,
        borderColor: getScenarioColor(scenario.name),
        backgroundColor: 'transparent',
        borderWidth: scenario.name === forecast?.optimalStrategy ? 3 : 1,
        tension: 0.4,
        pointRadius: 2
      };
    });

    // Линия целевой суммы
    datasets.push({
      label: 'Целевая сумма',
      data: Array(months.length).fill(parseFloat(goal.target_amount)),
      borderColor: '#f44336',
      borderWidth: 2,
      borderDash: [5, 5],
      pointRadius: 0,
      fill: false
    });

    setTimelineData({ labels: months, datasets });
  };

  /**
   * Генерация данных для сравнительной диаграммы
   */
  const generateComparisonData = (scenariosForecast) => {
    setComparisonData({
      labels: scenariosForecast.map(s => s.name),
      datasets: [
        {
          label: 'Срок достижения (мес.)',
          data: scenariosForecast.map(s => s.monthsToGoal),
          backgroundColor: 'rgba(33, 150, 243, 0.7)',
          borderColor: '#1976d2',
          borderWidth: 1
        },
        {
          label: 'Уверенность (%)',
          data: scenariosForecast.map(s => s.confidence),
          backgroundColor: 'rgba(76, 175, 80, 0.7)',
          borderColor: '#388e3c',
          borderWidth: 1
        }
      ]
    });
  };

  const getScenarioColor = (name) => {
    const colors = {
      'Консервативный': '#2196f3',
      'Умеренный': '#ff9800',
      'Агрессивный': '#f44336'
    };
    return colors[name] || '#4caf50';
  };

  const formatCurrency = (amount) => {
    const num = parseFloat(amount) || 0;
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(num);
  };

  const formatDate = (dateString) => {
    if (!dateString) return "—";
    try {
      return new Date(dateString).toLocaleDateString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch {
      return "—";
    }
  };

  const calculateProgress = () => {
    if (!goal) return 0;
    return Math.min(100, Math.round((parseFloat(goal.current_amount || 0) / parseFloat(goal.target_amount)) * 100));
  };

  const lineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom' },
      tooltip: {
        callbacks: {
          label: (context) => {
            return `${context.dataset.label}: ${formatCurrency(context.parsed.y)}`;
          }
        }
      }
    },
    scales: {
      y: {
        ticks: {
          callback: (value) => formatCurrency(value)
        }
      }
    }
  };

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom' }
    }
  };

  // Если загружаем список целей
  if (loading && !goal && allGoals.length === 0) {
    return (
      <Layout>
        <div className="loadingContainer">
          <div className="loadingAnimation"></div>
          <p>Загружаем данные для прогноза...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="forecastContainer">
        {/* Хлебные крошки */}
        <div className="breadcrumb">
          <Link to="/">🏠 Главная</Link>
          <span className="breadcrumbSeparator">›</span>
          <Link to="/goals">🎯 Цели</Link>
          <span className="breadcrumbSeparator">›</span>
          <span className="breadcrumbCurrent">Прогноз</span>
        </div>

        {/* Заголовок */}
        <div className="pageHeaderForecast">
          <div className="headerContentForecast">
            <h1>📊 Финансовый прогноз</h1>
            <p className="headerDescription">
              Математический расчет достижения целей на основе ваших сценариев
            </p>
          </div>
        </div>

        {/* Селектор целей */}
        <div className="goalSelectorSection">
          <div className="selectorContainer">
            <label htmlFor="goalSelect" className="selectorLabel">
              Выберите цель для прогноза:
            </label>
            <select
              id="goalSelect"
              className="goalSelect"
              value={selectedGoalId}
              onChange={handleGoalSelect}
            >
              <option value="">-- Выберите цель --</option>
              {allGoals.map(goal => (
                <option key={goal.goal_id} value={goal.goal_id}>
                  {goal.title} - {formatCurrency(goal.target_amount)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Если цель не выбрана - показываем список целей */}
        {!selectedGoalId && allGoals.length > 0 && (
          <div className="goalsFlex">
            <h2>Ваши цели</h2>
            <div className="goalsCardFlex">
              {allGoals.map(goal => (
                <div
                  key={goal.goal_id}
                  className="goalCard"
                  onClick={() => {
                    setSelectedGoalId(goal.goal_id);
                    navigate(`/forecast/${goal.goal_id}`);
                  }}
                >
                  <div className="goalCardHeader">
                    <h3>{goal.title}</h3>
                  </div>
                  <div className="goalCardBody">
                    <div className="goalCardRow">
                      <span>Цель:</span>
                      <strong>{formatCurrency(goal.target_amount)}</strong>
                    </div>
                    <div className="goalCardRow">
                      <span>Прогресс:</span>
                      <strong>{Math.round((parseFloat(goal.current_amount || 0) / parseFloat(goal.target_amount)) * 100)}%</strong>
                    </div>
                  </div>
                  <div className="goalCardFooter">
                    <button className="selectGoalButton">
                      Выбрать для прогноза →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Если цель выбрана, но нет сценариев */}
        {selectedGoalId && !loading && scenarios.length === 0 && (
          <div className="emptyState">
            <div className="emptyStateIcon">📊</div>
            <h3>Нет сценариев для анализа</h3>
            <p>Для получения прогноза необходимо создать хотя бы один сценарий</p>
            <button
              onClick={() => navigate(`/scenarios/new/${selectedGoalId}`)}
              className="emptyStateButton"
            >
              ➕ Создать сценарий
            </button>
          </div>
        )}

        {/* Если цель выбрана и идет расчет */}
        {selectedGoalId && calculating && (
          <div className="loadingContainer">
            <div className="loadingAnimation"></div>
            <p>🧮 Выполняем математические расчеты...</p>
          </div>
        )}

        {/* Если прогноз готов */}
        {selectedGoalId && forecast && !calculating && (
          <>
            {/* Информация о цели */}
            <div className="goalInfoCard">
              <div className="goalInfoHeader">
                <h2>{goal?.title}</h2>
                <span className={`goalStatus ${goal?.status}`}>
                  {goal?.status === 'active' ? 'Активна' : 'Завершена'}
                </span>
              </div>
              
              <div className="goalInfoFlex">
                <div className="goalInfoItem">
                  <span className="infoLabel">Целевая сумма:</span>
                  <span className="infoValue highlight">{formatCurrency(goal?.target_amount)}</span>
                </div>
                <div className="goalInfoItem">
                  <span className="infoLabel">Текущая сумма:</span>
                  <span className="infoValue">{formatCurrency(goal?.current_amount || 0)}</span>
                </div>
                <div className="goalInfoItem">
                  <span className="infoLabel">Прогресс:</span>
                  <span className="infoValue">{calculateProgress()}%</span>
                </div>
                <div className="goalInfoItem">
                  <span className="infoLabel">Сценариев:</span>
                  <span className="infoValue">{scenarios.length}</span>
                </div>
              </div>
              
              <div className="progressBar">
                <div className="progressFill" style={{ width: `${calculateProgress()}%` }} />
              </div>
            </div>

            {/* Вкладки */}
            <div className="tabsContainer">
              <button
                className={`tabButton ${activeTab === 'overview' ? 'active' : ''}`}
                onClick={() => setActiveTab('overview')}
              >
                📊 Обзор
              </button>
              <button
                className={`tabButton ${activeTab === 'scenarios' ? 'active' : ''}`}
                onClick={() => setActiveTab('scenarios')}
              >
                📈 Сценарии
              </button>
              <button
                className={`tabButton ${activeTab === 'comparison' ? 'active' : ''}`}
                onClick={() => setActiveTab('comparison')}
              >
                📉 Сравнение
              </button>
            </div>

            {/* Вкладка Обзор */}
            {activeTab === 'overview' && (
              <div className="tabContent">
                <div className="summaryCard">
                  <div className="summaryIcon">📊</div>
                  <div className="summaryText">
                    <h3>Резюме прогноза</h3>
                    <p>{forecast.summary}</p>
                  </div>
                </div>

                <div className="optimalStrategyCard">
                  <h3>🎯 Оптимальная стратегия</h3>
                  <div className="optimalStrategyContent">
                    <div className="strategyName">{forecast.optimalStrategy}</div>
                    <div className="strategyDetails">
                      {forecast.scenarios?.find(s => s.name === forecast.optimalStrategy) && (
                        <>
                          <div className="strategyDetail">
                            <span>Срок достижения:</span>
                            <strong>
                              {forecast.scenarios.find(s => s.name === forecast.optimalStrategy).monthsToGoal} месяцев
                            </strong>
                          </div>
                          <div className="strategyDetail">
                            <span>Итоговая сумма:</span>
                            <strong>
                              {formatCurrency(forecast.scenarios.find(s => s.name === forecast.optimalStrategy).finalAmount)}
                            </strong>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* График прогноза */}
                {timelineData && (
                  <div className="chartCard">
                    <h3>📈 Прогноз роста накоплений</h3>
                    <div className="chartContainer" style={{ height: '400px' }}>
                      <Line data={timelineData} options={lineOptions} />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Вкладка Сценарии */}
            {activeTab === 'scenarios' && (
              <div className="tabContent">
                <div className="scenariosGrid">
                  {forecast.scenarios?.map(scenario => (
                    <div key={scenario.name} className="scenarioDetailCard">
                      <div className="scenarioDetailHeader">
                        <h3>{scenario.name}</h3>
                        {scenario.name === forecast.optimalStrategy && (
                          <span className="optimalBadge">⭐ Оптимальный</span>
                        )}
                      </div>
                      
                      <div className="scenarioParams">
                        <div className="paramItem">
                          <span>Взнос:</span>
                          <strong>{formatCurrency(scenario.monthlyContribution)}/мес</strong>
                        </div>
                        <div className="paramItem">
                          <span>Доходность:</span>
                          <strong>{scenario.expectedReturn}%</strong>
                        </div>
                      </div>
                      
                      <div className="scenarioResults">
                        <div className="resultItem">
                          <span>Срок:</span>
                          <span className="resultValue">{scenario.monthsToGoal} мес.</span>
                        </div>
                        <div className="resultItem">
                          <span>Дата:</span>
                          <span className="resultValue">{formatDate(scenario.predictedDate)}</span>
                        </div>
                        <div className="resultItem">
                          <span>Итог:</span>
                          <span className="resultValue highlight">{formatCurrency(scenario.finalAmount)}</span>
                        </div>
                      </div>
                      
                      <div className="scenarioRisk">
                        <span className={`riskIndicator ${scenario.risk}`}>
                          {scenario.risk === 'низкий' ? '🟢' : scenario.risk === 'средний' ? '🟡' : '🔴'} Риск: {scenario.risk}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Вкладка Сравнение */}
            {activeTab === 'comparison' && comparisonData && (
              <div className="tabContent">
                <div className="chartCard">
                  <h3>📊 Сравнение сценариев</h3>
                  <div className="chartContainer" style={{ height: '400px' }}>
                    <Bar data={comparisonData} options={barOptions} />
                  </div>
                </div>

                <div className="comparisonTable">
                  <h3>📋 Детальное сравнение</h3>
                  <div className="tableContainer">
                    <table>
                      <thead>
                        <tr>
                          <th>Сценарий</th>
                          <th>Срок (мес.)</th>
                          <th>Дата</th>
                          <th>Итоговая сумма</th>
                          <th>Уверенность</th>
                          <th>Риск</th>
                        </tr>
                      </thead>
                      <tbody>
                        {forecast.scenarios?.map(scenario => (
                          <tr key={scenario.name} className={scenario.name === forecast.optimalStrategy ? 'optimalRow' : ''}>
                            <td><strong>{scenario.name}</strong></td>
                            <td>{scenario.monthsToGoal}</td>
                            <td>{formatDate(scenario.predictedDate)}</td>
                            <td className="amount">{formatCurrency(scenario.finalAmount)}</td>
                            <td>
                              <div className="confidenceBar">
                                <div className="confidenceFill" style={{ width: `${scenario.confidence}%` }} />
                                <span>{scenario.confidence}%</span>
                              </div>
                            </td>
                            <td>
                              <span className={`riskBadge ${scenario.risk}`}>
                                {scenario.risk}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Кнопка пересчета */}
            <div className="recalculateButton">
              <button
                onClick={calculateForecast}
                className="actionButton secondaryButton"
              >
                🔄 Пересчитать прогноз
              </button>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}

export default ForecastPage;