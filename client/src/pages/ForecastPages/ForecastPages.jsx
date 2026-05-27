import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  TrendingUp,
  Target,
  Calendar,
  DollarSign,
  Clock,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  BarChart3,
  LineChart,
  PieChart,
  CheckCircle,
  Zap,
  Shield,
  Activity,
  Plus,
} from "lucide-react";
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
  Filler,
} from "chart.js";
import { Line, Bar } from "react-chartjs-2";
import "./ForecastPage.css";

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

  useEffect(() => {
    loadAllGoals();
  }, []);

  useEffect(() => {
    if (selectedGoalId) {
      loadGoalData(selectedGoalId);
    } else {
      setGoal(null);
      setScenarios([]);
      setForecast(null);
    }
  }, [selectedGoalId]);

  useEffect(() => {
    if (goal && scenarios.length > 0) {
      loadOrCalculateForecast();
    }
  }, [goal, scenarios]);

  const loadAllGoals = async () => {
    try {
      const goalsData = await getGoals();
      setAllGoals(goalsData);
    } catch (error) {
      console.error("Ошибка загрузки списка целей:", error);
      setError("Не удалось загрузить список целей");
    }
  };

  const loadGoalData = async (id) => {
    try {
      setLoading(true);
      setError("");
      setForecast(null);

      const goalData = await getGoal(id);

      if (!goalData) {
        setError("Цель не найдена");
        setLoading(false);
        return;
      }

      setGoal(goalData);

      const scenariosData = await getScenarios(id);
      setScenarios(scenariosData || []);
    } catch (error) {
      console.error("Ошибка загрузки данных:", error);
      setError("Не удалось загрузить данные: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const loadOrCalculateForecast = async () => {
    if (!goal || scenarios.length === 0) return;

    setCalculating(true);

    try {
      const token = localStorage.getItem("token");

      const getResponse = await fetch(`/api/forecast/${goal.goal_id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const getData = await getResponse.json();

      if (getResponse.ok && getData && !getData.error) {
        if (getData.detailed_forecast) {
          setForecast(getData.detailed_forecast);
          generateChartsFromForecast(getData.detailed_forecast);
        } else {
          const convertedForecast = convertStoredForecast(getData);
          setForecast(convertedForecast);
          generateChartsFromForecast(convertedForecast);
        }
      } else {
        const postResponse = await fetch(`/api/forecast/${goal.goal_id}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        const postData = await postResponse.json();

        if (postResponse.ok && postData.success) {
          setForecast(postData.forecast);
          generateChartsFromForecast(postData.forecast);
        } else {
          throw new Error(postData.error || "Ошибка расчёта прогноза");
        }
      }
    } catch (error) {
      console.error("Ошибка получения/расчёта прогноза:", error);
      setError("Не удалось получить прогноз: " + error.message);
    } finally {
      setCalculating(false);
    }
  };

  const convertStoredForecast = (storedForecast) => {
    return {
      goal: {
        id: storedForecast.goal_id,
        title: goal?.title,
        current_amount: parseFloat(storedForecast.current_amount),
        target_amount: parseFloat(storedForecast.target_amount),
        remaining: parseFloat(storedForecast.target_amount) - parseFloat(storedForecast.current_amount),
      },
      optimalStrategy: storedForecast.remaining_months
        ? `Достижение через ${storedForecast.remaining_months} месяцев`
        : "Прогноз рассчитан",
      summary:
        `При текущем прогрессе ${Math.round(
          (parseFloat(storedForecast.current_amount) / parseFloat(storedForecast.target_amount)) * 100
        )}% цель будет достигнута через ${storedForecast.remaining_months || "?"} месяцев`,
      scenarios: scenarios.map((scenario) => ({
        name: scenario.name,
        monthlyContribution: parseFloat(scenario.monthly_contribution),
        expectedReturn: parseFloat(scenario.expected_return),
        monthsToGoal: storedForecast.remaining_months || 12,
        predictedDate:
          storedForecast.predicted_finish_date?.split("T")[0] || new Date().toISOString().split("T")[0],
        finalAmount: parseFloat(storedForecast.target_amount),
        confidence: 85,
        risk: "средний",
      })),
      recommendations: [],
      risks: [],
    };
  };

  const generateChartsFromForecast = (forecastData) => {
    if (!forecastData || !forecastData.scenarios) return;
    generateTimelineData(forecastData.scenarios);
    generateComparisonData(forecastData.scenarios);
  };

  const generateTimelineData = (scenariosForecast) => {
    if (!goal || !scenariosForecast || scenariosForecast.length === 0) return;

    const today = new Date();
    const months = [];
    const maxMonths = Math.max(...scenariosForecast.map((s) => s.monthsToGoal || 24)) + 6;

    for (let i = 0; i <= Math.min(maxMonths, 120); i += 3) {
      const date = new Date(today);
      date.setMonth(date.getMonth() + i);
      months.push(date.toLocaleDateString("ru-RU", { month: "short", year: "numeric" }));
    }

    const datasets = scenariosForecast.map((scenario, idx) => {
      const data = [];
      let currentAmount = parseFloat(goal.current_amount || 0);
      const monthlyContribution = scenario.monthlyContribution || 0;
      const monthlyReturn = (scenario.expectedReturn || 0) / 100 / 12;

      for (let i = 0; i <= months.length - 1; i++) {
        let simulatedAmount = currentAmount;
        const monthsPassed = i * 3;
        for (let j = 0; j < monthsPassed; j++) {
          simulatedAmount += monthlyContribution;
          simulatedAmount *= 1 + monthlyReturn;
        }
        data.push(Math.round(simulatedAmount));
      }

      return {
        label: scenario.name,
        data: data,
        borderColor: getScenarioColor(idx),
        backgroundColor: "transparent",
        borderWidth: scenario.name === forecast?.optimalStrategy ? 3 : 1,
        tension: 0.4,
        pointRadius: 2,
        pointHoverRadius: 4,
      };
    });

    datasets.push({
      label: "Целевая сумма",
      data: Array(months.length).fill(parseFloat(goal.target_amount)),
      borderColor: "#E35D5D",
      borderWidth: 2,
      borderDash: [5, 5],
      pointRadius: 0,
      fill: false,
    });

    setTimelineData({ labels: months, datasets });
  };

  const generateComparisonData = (scenariosForecast) => {
    if (!scenariosForecast || scenariosForecast.length === 0) return;

    setComparisonData({
      labels: scenariosForecast.map((s) => (s.name.length > 20 ? s.name.substring(0, 17) + "..." : s.name)),
      datasets: [
        {
          label: "Срок достижения (мес.)",
          data: scenariosForecast.map((s) => s.monthsToGoal || 0),
          backgroundColor: "rgba(33, 150, 243, 0.7)",
          borderColor: "#1976d2",
          borderWidth: 1,
          borderRadius: 8,
        },
        {
          label: "Уверенность (%)",
          data: scenariosForecast.map((s) => s.confidence || 80),
          backgroundColor: "rgba(76, 175, 80, 0.7)",
          borderColor: "#388e3c",
          borderWidth: 1,
          borderRadius: 8,
        },
      ],
    });
  };

  const getScenarioColor = (index) => {
    const colors = ["#2196f3", "#ff9800", "#f44336", "#4caf50", "#9c27b0"];
    return colors[index % colors.length];
  };

  const getRiskIcon = (risk) => {
    if (risk === "низкий") return <Shield size={14} />;
    if (risk === "средний") return <Activity size={14} />;
    return <Zap size={14} />;
  };

  const getRiskColor = (risk) => {
    if (risk === "низкий") return "riskLow";
    if (risk === "средний") return "riskMedium";
    return "riskHigh";
  };

  const handleGoalSelect = (e) => {
    const newGoalId = e.target.value;
    setSelectedGoalId(newGoalId);
    if (newGoalId) {
      navigate(`/forecast/${newGoalId}`);
    } else {
      navigate("/forecast");
    }
  };

  const handleRecalculate = async () => {
    if (!goal) return;
    setCalculating(true);

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/forecast/${goal.goal_id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setForecast(data.forecast);
        generateChartsFromForecast(data.forecast);
      } else {
        throw new Error(data.error || "Ошибка пересчёта");
      }
    } catch (error) {
      console.error("Ошибка пересчёта:", error);
      setError("Не удалось пересчитать прогноз: " + error.message);
    } finally {
      setCalculating(false);
    }
  };

  const formatCurrency = (amount) => {
    const num = parseFloat(amount) || 0;
    return new Intl.NumberFormat("ru-RU", {
      style: "currency",
      currency: "RUB",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(num);
  };

  const formatDate = (dateString) => {
    if (!dateString) return "—";
    try {
      return new Date(dateString).toLocaleDateString("ru-RU", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    } catch {
      return "—";
    }
  };

  const calculateProgress = () => {
    if (!goal) return 0;
    return Math.min(
      100,
      Math.round((parseFloat(goal.current_amount || 0) / parseFloat(goal.target_amount)) * 100)
    );
  };

  const lineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: "bottom", labels: { usePointStyle: true, boxWidth: 10 } },
      tooltip: {
        callbacks: {
          label: (context) => `${context.dataset.label}: ${formatCurrency(context.parsed.y)}`,
        },
      },
    },
    scales: {
      y: {
        ticks: { callback: (value) => formatCurrency(value) },
        grid: { color: "rgba(73, 86, 49, 0.08)" },
      },
      x: {
        grid: { display: false },
      },
    },
  };

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: "bottom" },
      tooltip: {
        callbacks: {
          label: (context) => `${context.dataset.label}: ${context.parsed.y}`,
        },
      },
    },
    scales: {
      y: {
        grid: { color: "rgba(73, 86, 49, 0.08)" },
      },
    },
  };

  if (loading && !goal && allGoals.length === 0) {
    return (
      <Layout>
        <div className="forecastLoading">
          <div className="loadingSpinner" />
          <p>Загружаем данные для прогноза...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="forecastPage">
        <div className="breadcrumb">
          <Link to="/">
            <TrendingUp size={14} />
            Главная
          </Link>
          <span>/</span>
          <Link to="/goals">
            <Target size={14} />
            Цели
          </Link>
          <span>/</span>
          <span className="current">Прогноз</span>
        </div>

        <div className="pageHeaderForecast">
          <h1>Финансовый прогноз</h1>
          <p>Математический расчет достижения целей на основе ваших сценариев</p>
        </div>

        <div className="goalSelector">
          <label htmlFor="goalSelect">Выберите цель для прогноза:</label>
          <select id="goalSelect" value={selectedGoalId} onChange={handleGoalSelect}>
            <option value="">-- Выберите цель --</option>
            {allGoals.map((g) => (
              <option key={g.goal_id} value={g.goal_id}>
                {g.title} - {formatCurrency(g.target_amount)}
              </option>
            ))}
          </select>
        </div>

        {error && (
          <div className="errorCard">
            <AlertCircle size={20} />
            <span>{error}</span>
          </div>
        )}

        {!selectedGoalId && allGoals.length > 0 && (
          <div className="goalsList">
            <h2>Ваши цели</h2>
            <div className="goalsGrid">
              {allGoals.map((g) => (
                <div
                  key={g.goal_id}
                  className="goalCard"
                  onClick={() => {
                    setSelectedGoalId(g.goal_id);
                    navigate(`/forecast/${g.goal_id}`);
                  }}
                >
                  <div className="goalCardHeaderForecast">
                    <h3>{g.title}</h3>
                    <span className={`goalStatus ${g.status}`}>
                      {g.status === "active" ? "Активна" : "Завершена"}
                    </span>
                  </div>
                  <div className="goalCardBody">
                    <div className="goalCardRow">
                      <span>Цель:</span>
                      <strong>{formatCurrency(g.target_amount)}</strong>
                    </div>
                    <div className="goalCardRow">
                      <span>Прогресс:</span>
                      <strong>
                        {Math.round((parseFloat(g.current_amount || 0) / parseFloat(g.target_amount)) * 100)}%
                      </strong>
                    </div>
                  </div>
                  <div className="goalCardFooter">
                    <button className="selectGoalButton">
                      Выбрать для прогноза <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {selectedGoalId && !loading && scenarios.length === 0 && (
          <div className="emptyState">
            <PieChart size={48} />
            <h2>Нет сценариев для анализа</h2>
            <p>Для получения прогноза необходимо создать хотя бы один сценарий</p>
            <button onClick={() => navigate(`/scenarios/new/${selectedGoalId}`)} className="createButton">
              <Plus size={16} />
              Создать сценарий
            </button>
          </div>
        )}

        {selectedGoalId && calculating && (
          <div className="calculatingState">
            <div className="loadingSpinner" />
            <p>Выполняем математические расчеты...</p>
          </div>
        )}

        {selectedGoalId && forecast && !calculating && (
          <>
            <div className="goalInfoCard">
              <div className="goalInfoHeader">
                <h2>{goal?.title}</h2>
                <span className={`statusBadge status-${goal?.status}`}>
                  {goal?.status === "active" ? "Активна" : "Завершена"}
                </span>
              </div>

              <div className="goalInfoStatsForecast">
                <div className="statItem">
                  <Target size={18} />
                  <div>
                    <span>Целевая сумма</span>
                    <strong>{formatCurrency(goal?.target_amount)}</strong>
                  </div>
                </div>
                <div className="statItem">
                  <DollarSign size={18} />
                  <div>
                    <span>Текущая сумма</span>
                    <strong>{formatCurrency(goal?.current_amount || 0)}</strong>
                  </div>
                </div>
                <div className="statItem">
                  <TrendingUp size={18} />
                  <div>
                    <span>Прогресс</span>
                    <strong>{calculateProgress()}%</strong>
                  </div>
                </div>
                <div className="statItem">
                  <BarChart3 size={18} />
                  <div>
                    <span>Сценариев</span>
                    <strong>{scenarios.length}</strong>
                  </div>
                </div>
              </div>

              <div className="progressBar">
                <div className="progressFill" style={{ width: `${calculateProgress()}%` }} />
              </div>
            </div>

            <div className="tabs">
              <button className={`tab ${activeTab === "overview" ? "active" : ""}`} onClick={() => setActiveTab("overview")}>
                <LineChart size={16} />
                Обзор
              </button>
              <button className={`tab ${activeTab === "scenarios" ? "active" : ""}`} onClick={() => setActiveTab("scenarios")}>
                <PieChart size={16} />
                Сценарии
              </button>
              <button className={`tab ${activeTab === "comparison" ? "active" : ""}`} onClick={() => setActiveTab("comparison")}>
                <BarChart3 size={16} />
                Сравнение
              </button>
            </div>

            {activeTab === "overview" && (
              <div className="tabContent">
                <div className="summaryCard">
                  <div className="summaryIcon">
                    <TrendingUp size={32} />
                  </div>
                  <div className="summaryText">
                    <h3>Резюме прогноза</h3>
                    <p>{forecast.summary || `Прогноз рассчитан на основе ${scenarios.length} сценариев`}</p>
                  </div>
                </div>

                <div className="optimalStrategyCard">
                  <h3>
                    <CheckCircle size={18} />
                    Оптимальная стратегия
                  </h3>
                  <div className="optimalStrategyContent">
                    <div className="strategyName">{forecast.optimalStrategy || forecast.scenarios?.[0]?.name || "Рекомендуемый план"}</div>
                    {forecast.scenarios?.find((s) => s.name === forecast.optimalStrategy) && (
                      <div className="strategyDetails">
                        <div className="detail">
                          <span>Срок достижения:</span>
                          <strong>
                            {forecast.scenarios.find((s) => s.name === forecast.optimalStrategy).monthsToGoal} месяцев
                          </strong>
                        </div>
                        <div className="detail">
                          <span>Итоговая сумма:</span>
                          <strong>
                            {formatCurrency(
                              forecast.scenarios.find((s) => s.name === forecast.optimalStrategy).finalAmount
                            )}
                          </strong>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {timelineData && (
                  <div className="chartCardForecast">
                    <h3>Прогноз роста накоплений</h3>
                    <div className="chartContainer">
                      <Line data={timelineData} options={lineOptions} />
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === "scenarios" && (
              <div className="tabContent">
                <div className="scenariosGrid">
                  {forecast.scenarios?.map((scenario, idx) => (
                    <div key={idx} className="scenarioCard">
                      <div className="scenarioHeaderForecast">
                        <h3>{scenario.name}</h3>
                        {scenario.name === forecast.optimalStrategy && (
                          <span className="optimalBadge">Оптимальный</span>
                        )}
                      </div>

                      <div className="scenarioParams">
                        <div className="param">
                          <span>Взнос:</span>
                          <strong>{formatCurrency(scenario.monthlyContribution)}/мес</strong>
                        </div>
                        <div className="param">
                          <span>Доходность:</span>
                          <strong>{scenario.expectedReturn}%</strong>
                        </div>
                      </div>

                      <div className="scenarioResults">
                        <div className="result">
                          <span>Срок:</span>
                          <span className="value">{scenario.monthsToGoal} мес.</span>
                        </div>
                        <div className="result">
                          <span>Дата:</span>
                          <span className="value">{formatDate(scenario.predictedDate)}</span>
                        </div>
                        <div className="result">
                          <span>Итог:</span>
                          <span className="value highlight">{formatCurrency(scenario.finalAmount)}</span>
                        </div>
                      </div>

                      <div className={`scenarioRisk ${getRiskColor(scenario.risk || "средний")}`}>
                        {getRiskIcon(scenario.risk || "средний")}
                        <span>Риск: {scenario.risk || "средний"}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === "comparison" && comparisonData && (
              <div className="tabContent">
                <div className="charchartCardForecasttCard">
                  <h3>Сравнение сценариев</h3>
                  <div className="chartContainer">
                    <Bar data={comparisonData} options={barOptions} />
                  </div>
                </div>

                <div className="comparisonTable">
                  <h3>Детальное сравнение</h3>
                  <div className="tableWrapper">
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
                        {forecast.scenarios?.map((scenario, idx) => (
                          <tr key={idx} className={scenario.name === forecast.optimalStrategy ? "optimalRow" : ""}>
                            <td>
                              <strong>{scenario.name}</strong>
                            </td>
                            <td>{scenario.monthsToGoal}</td>
                            <td>{formatDate(scenario.predictedDate)}</td>
                            <td className="amount">{formatCurrency(scenario.finalAmount)}</td>
                            <td>
                              <div className="confidenceBar">
                                <div className="confidenceFill" style={{ width: `${scenario.confidence || 85}%` }} />
                                <span>{scenario.confidence || 85}%</span>
                              </div>
                            </td>
                            <td>
                              <span className={`riskBadge ${getRiskColor(scenario.risk || "средний")}`}>
                                {scenario.risk || "средний"}
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

            <div className="recalculateSection">
              <button onClick={handleRecalculate} disabled={calculating} className="recalculateButton">
                <RefreshCw size={16} className={calculating ? "spinning" : ""} />
                {calculating ? "Пересчёт..." : "Пересчитать прогноз"}
              </button>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}

export default ForecastPage;