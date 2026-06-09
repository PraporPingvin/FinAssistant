import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  Activity,
  AlertCircle,
  BarChart3,
  CheckCircle,
  Clock,
  DollarSign,
  LineChart,
  PieChart,
  Plus,
  RefreshCw,
  Shield,
  Target,
  TrendingUp,
  Zap,
} from "lucide-react";
import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Title,
  Tooltip,
} from "chart.js";
import { Bar, Line } from "react-chartjs-2";
import Layout from "../../components/Layout";
import { getGoal, getGoals, getPayments, getScenarios } from "../../api/api";
import { calculateScenarioMetrics, formatPercent } from "../../utils/scenarioCalculations";
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

const BASELINE_ID = "goal-baseline";

function ForecastPage() {
  const { goalId } = useParams();
  const navigate = useNavigate();

  const [allGoals, setAllGoals] = useState([]);
  const [goal, setGoal] = useState(null);
  const [payments, setPayments] = useState([]);
  const [scenarios, setScenarios] = useState([]);
  const [selectedGoalId, setSelectedGoalId] = useState(goalId || "");
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    loadAllGoals();
  }, []);

  useEffect(() => {
    setSelectedGoalId(goalId || "");
  }, [goalId]);

  useEffect(() => {
    if (selectedGoalId) {
      loadGoalData(selectedGoalId);
    } else {
      setGoal(null);
      setPayments([]);
      setScenarios([]);
      setLoading(false);
    }
  }, [selectedGoalId]);

  const loadAllGoals = async () => {
    try {
      const goalsData = await getGoals();
      setAllGoals(Array.isArray(goalsData) ? goalsData : []);
    } catch (loadError) {
      console.error("Ошибка загрузки целей:", loadError);
      setError("Не удалось загрузить список целей.");
    }
  };

  const loadGoalData = async (id) => {
    try {
      setLoading(true);
      setCalculating(true);
      setError("");

      const [goalData, scenariosData, paymentsData] = await Promise.all([
        getGoal(id),
        getScenarios(id).catch(() => []),
        getPayments(id).catch(() => []),
      ]);

      if (!goalData) {
        setError("Цель не найдена.");
        return;
      }

      setGoal(goalData);
      setScenarios(Array.isArray(scenariosData) ? scenariosData : []);
      setPayments(Array.isArray(paymentsData) ? paymentsData : []);
    } catch (loadError) {
      console.error("Ошибка загрузки прогноза:", loadError);
      setError(`Не удалось загрузить прогноз: ${loadError.message}`);
    } finally {
      setLoading(false);
      setCalculating(false);
    }
  };

  const forecast = useMemo(() => {
    if (!goal) return null;

    const baseline = buildBaselineScenario(goal);
    const scenarioInputs = [baseline, ...scenarios];
    const scenarioForecasts = scenarioInputs.map((scenario, index) => {
      const metrics = calculateScenarioMetrics({ goal, scenario, payments });
      const predictedDate = addMonths(new Date(), metrics.monthsToGoal);
      const isBaseline = scenario.scenario_id === BASELINE_ID;

      return {
        id: scenario.scenario_id || scenario.id || index,
        name: scenario.name,
        isBaseline,
        monthlyContribution: metrics.monthly,
        expectedReturn: metrics.expectedReturn,
        inflationRate: metrics.inflation,
        effectiveReturn: metrics.effectiveReturn,
        monthsToGoal: metrics.monthsToGoal,
        predictedDate,
        finalAmount: Number.isFinite(metrics.monthsToGoal) ? metrics.target : metrics.current,
        confidence: metrics.probability,
        risk: isBaseline ? "Низкий" : metrics.risk.label,
        riskClass: isBaseline ? "low" : metrics.risk.className,
        current: metrics.current,
        target: metrics.target,
        remaining: metrics.remaining,
        rating: metrics.rating,
      };
    });

    const reachable = scenarioForecasts.filter((item) => Number.isFinite(item.monthsToGoal));
    const optimal = reachable.length
      ? [...reachable].sort((a, b) => a.monthsToGoal - b.monthsToGoal || b.confidence - a.confidence)[0]
      : scenarioForecasts[0];
    const baselineForecast = scenarioForecasts[0];
    const current = baselineForecast.current;
    const target = baselineForecast.target;
    const progress = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;

    return {
      goal: {
        current,
        target,
        remaining: Math.max(0, target - current),
        progress,
      },
      baseline: baselineForecast,
      scenarios: scenarioForecasts,
      userScenariosCount: scenarios.length,
      optimalStrategy: optimal?.name || null,
      summary: buildSummary({ goal, optimal, baseline: baselineForecast, scenariosCount: scenarios.length, progress }),
      recommendations: buildRecommendations({ baseline: baselineForecast, optimal, scenariosCount: scenarios.length }),
    };
  }, [goal, payments, scenarios]);

  const timelineData = useMemo(() => {
    if (!goal || !forecast) return null;
    return generateTimelineData({ goal, scenariosForecast: forecast.scenarios });
  }, [goal, forecast]);

  const comparisonData = useMemo(() => {
    if (!forecast) return null;
    return {
      labels: forecast.scenarios.map((item) => truncateLabel(item.name)),
      datasets: [
        {
          label: "Срок достижения (мес.)",
          data: forecast.scenarios.map((item) => (Number.isFinite(item.monthsToGoal) ? item.monthsToGoal : 0)),
          backgroundColor: "rgba(79, 124, 255, 0.88)",
          borderRadius: 14,
          borderSkipped: false,
        },
        {
          label: "Вероятность выполнения (%)",
          data: forecast.scenarios.map((item) => item.confidence || 0),
          backgroundColor: "rgba(39, 166, 106, 0.84)",
          borderRadius: 14,
          borderSkipped: false,
        },
      ],
    };
  }, [forecast]);

  const handleGoalSelect = (event) => {
    const newGoalId = event.target.value;
    setSelectedGoalId(newGoalId);
    navigate(newGoalId ? `/forecast/${newGoalId}` : "/forecast");
  };

  const handleRecalculate = async () => {
    if (!goal) return;
    setCalculating(true);
    await loadGoalData(goal.goal_id);
  };

  const formatCurrency = (amount) => {
    const num = Number(amount) || 0;
    return new Intl.NumberFormat("ru-RU", {
      style: "currency",
      currency: "RUB",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(num);
  };

  const formatDate = (dateString) => {
    if (!dateString) return "Не достигнется";
    return new Date(dateString).toLocaleDateString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const formatMonths = (months) => {
    if (!Number.isFinite(months)) return "Не достигнется";
    if (months === 0) return "Цель уже достигнута";
    return `${months} мес.`;
  };

  const chartFont = {
    family: "Manrope, Aptos Display, Segoe UI, sans-serif",
  };

  const lineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { intersect: false, mode: "index" },
    plugins: {
      legend: {
        position: "bottom",
        labels: {
          usePointStyle: true,
          boxWidth: 8,
          boxHeight: 8,
          color: "#667159",
          padding: 20,
          font: { ...chartFont, size: 12, weight: "700" },
        },
      },
      tooltip: {
        padding: 14,
        backgroundColor: "rgba(24, 32, 22, 0.92)",
        titleColor: "#ffffff",
        bodyColor: "rgba(255, 255, 255, 0.82)",
        callbacks: {
          label: (context) => `${context.dataset.label}: ${formatCurrency(context.parsed.y)}`,
        },
      },
    },
    scales: {
      y: {
        border: { display: false },
        ticks: {
          callback: (value) => formatCurrency(value),
          color: "#7b8465",
          font: { ...chartFont, size: 11, weight: "700" },
        },
        grid: { color: "rgba(24, 32, 22, 0.075)", drawTicks: false },
      },
      x: {
        border: { display: false },
        ticks: {
          color: "#7b8465",
          maxRotation: 0,
          font: { ...chartFont, size: 11, weight: "700" },
        },
        grid: { display: false, drawTicks: false },
      },
    },
  };

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "bottom",
        labels: {
          usePointStyle: true,
          color: "#667159",
          padding: 20,
          font: { ...chartFont, size: 12, weight: "700" },
        },
      },
      tooltip: {
        padding: 14,
        backgroundColor: "rgba(24, 32, 22, 0.92)",
        titleColor: "#ffffff",
        bodyColor: "rgba(255, 255, 255, 0.82)",
      },
    },
    scales: {
      y: {
        border: { display: false },
        ticks: {
          color: "#7b8465",
          font: { ...chartFont, size: 11, weight: "700" },
        },
        grid: { color: "rgba(24, 32, 22, 0.075)", drawTicks: false },
      },
      x: {
        border: { display: false },
        ticks: {
          color: "#7b8465",
          font: { ...chartFont, size: 11, weight: "700" },
        },
        grid: { display: false },
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

        <section className="forecastHero">
          <div className="pageHeaderForecast">
            <span className="forecastEyebrow">
              <Activity size={16} />
              Прогноз накоплений
            </span>
            <h1>Финансовый прогноз</h1>
            <p>
              Показываем базовый план цели и сравниваем его со сценариями. Так видно, что будет без
              дополнительных настроек, а что изменится при другом взносе, инфляции или росте.
            </p>
          </div>

          <div className="goalSelector">
            <label htmlFor="goalSelect">Цель для прогноза</label>
            <select id="goalSelect" value={selectedGoalId} onChange={handleGoalSelect}>
              <option value="">Выберите цель</option>
              {allGoals.map((item) => (
                <option key={item.goal_id} value={item.goal_id}>
                  {item.title} - {formatCurrency(item.target_amount)}
                </option>
              ))}
            </select>
          </div>
        </section>

        {error && (
          <div className="errorCard">
            <AlertCircle size={20} />
            <span>{error}</span>
          </div>
        )}

        {!selectedGoalId && allGoals.length > 0 && (
          <div className="goalsList">
            <h2>Ваши цели</h2>
            <div className="forecastGoalsGrid">
              {allGoals.map((item) => (
                <button
                  key={item.goal_id}
                  className="forecastGoalCard"
                  type="button"
                  onClick={() => {
                    setSelectedGoalId(item.goal_id);
                    navigate(`/forecast/${item.goal_id}`);
                  }}
                >
                  <div className="goalCardHeaderForecast">
                    <h3>{item.title}</h3>
                    <span className={`goalStatus ${item.status}`}>
                      {item.status === "active" ? "Активна" : "Завершена"}
                    </span>
                  </div>
                  <div className="forecastGoalCardBody">
                    <div className="forecastGoalCardRow">
                      <span>Цель</span>
                      <strong>{formatCurrency(item.target_amount)}</strong>
                    </div>
                    <div className="forecastGoalCardRow">
                      <span>Взнос в месяц</span>
                      <strong>{formatCurrency(item.monthly_contribution || 0)}</strong>
                    </div>
                  </div>
                  <div className="selectGoalButton">Выбрать для прогноза</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {selectedGoalId && calculating && (
          <div className="calculatingState">
            <div className="loadingSpinner" />
            <p>Пересчитываем прогноз по текущим данным цели...</p>
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
                    <strong>{formatCurrency(forecast.goal.target)}</strong>
                  </div>
                </div>
                <div className="statItem">
                  <DollarSign size={18} />
                  <div>
                    <span>Уже накоплено</span>
                    <strong>{formatCurrency(forecast.goal.current)}</strong>
                  </div>
                </div>
                <div className="statItem">
                  <TrendingUp size={18} />
                  <div>
                    <span>Прогресс</span>
                    <strong>{forecast.goal.progress}%</strong>
                  </div>
                </div>
                <div className="statItem">
                  <Clock size={18} />
                  <div>
                    <span>Базовый срок</span>
                    <strong>{formatMonths(forecast.baseline.monthsToGoal)}</strong>
                  </div>
                </div>
              </div>

              <div className="forecastProgressBar">
                <div className="forecastProgressFill" style={{ width: `${forecast.goal.progress}%` }} />
              </div>
            </div>

            <div className="forecastTabs">
              <button className={`forecastTab ${activeTab === "overview" ? "active" : ""}`} onClick={() => setActiveTab("overview")}>
                <LineChart size={16} />
                Обзор
              </button>
              <button className={`forecastTab ${activeTab === "scenarios" ? "active" : ""}`} onClick={() => setActiveTab("scenarios")}>
                <PieChart size={16} />
                Варианты
              </button>
              <button className={`forecastTab ${activeTab === "comparison" ? "active" : ""}`} onClick={() => setActiveTab("comparison")}>
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
                    <h3>Что показывает прогноз</h3>
                    <p>{forecast.summary}</p>
                  </div>
                </div>

                <div className="optimalStrategyCard">
                  <h3>
                    <CheckCircle size={18} />
                    Рекомендуемый вариант
                  </h3>
                  <div className="optimalStrategyContent">
                    <div className="strategyName">{forecast.optimalStrategy || "План цели"}</div>
                    <div className="strategyDetails">
                      <div className="detail">
                        <span>Срок</span>
                        <strong>{formatMonths(forecast.scenarios.find((item) => item.name === forecast.optimalStrategy)?.monthsToGoal)}</strong>
                      </div>
                      <div className="detail">
                        <span>Дата</span>
                        <strong>{formatDate(forecast.scenarios.find((item) => item.name === forecast.optimalStrategy)?.predictedDate)}</strong>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="forecastRecommendations">
                  {forecast.recommendations.map((item) => (
                    <div key={item.title} className={`forecastAdvice ${item.tone}`}>
                      <strong>{item.title}</strong>
                      <span>{item.text}</span>
                    </div>
                  ))}
                </div>

                {timelineData && (
                  <div className="chartCardForecast">
                    <h3>Прогноз роста накоплений</h3>
                    <p className="chartHint">
                      Первая линия - базовый план цели без сценариев. Остальные линии показывают, как сценарии меняют срок и темп.
                    </p>
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
                  {forecast.scenarios.map((scenario) => (
                    <div key={scenario.id} className={`scenarioCard ${scenario.isBaseline ? "baselineScenarioCard" : ""}`}>
                      <div className="scenarioHeaderForecast">
                        <h3>{scenario.name}</h3>
                        {scenario.isBaseline && <span className="optimalBadge">База</span>}
                        {!scenario.isBaseline && scenario.name === forecast.optimalStrategy && <span className="optimalBadge">Лучший</span>}
                      </div>

                      <div className="scenarioParams">
                        <div className="param">
                          <span>Взнос</span>
                          <strong>{formatCurrency(scenario.monthlyContribution)}/мес.</strong>
                        </div>
                        <div className="param">
                          <span>Рост после инфляции</span>
                          <strong>{formatPercent(scenario.effectiveReturn)}%</strong>
                        </div>
                      </div>

                      <div className="scenarioResults">
                        <div className="result">
                          <span>Срок</span>
                          <span className="value">{formatMonths(scenario.monthsToGoal)}</span>
                        </div>
                        <div className="result">
                          <span>Дата</span>
                          <span className="value">{formatDate(scenario.predictedDate)}</span>
                        </div>
                        <div className="result">
                          <span>Осталось</span>
                          <span className="value highlight">{formatCurrency(scenario.remaining)}</span>
                        </div>
                      </div>

                      <div className={`scenarioRisk ${getRiskColor(scenario.risk)}`}>
                        {getRiskIcon(scenario.risk)}
                        <span>Риск: {scenario.risk}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === "comparison" && comparisonData && (
              <div className="tabContent">
                <div className="chartCardForecast">
                  <h3>Сравнение вариантов</h3>
                  <p className="chartHint">Сравниваем базовый план цели и все созданные сценарии.</p>
                  <div className="chartContainer">
                    <Bar data={comparisonData} options={barOptions} />
                  </div>
                </div>

                <section className="forecastComparisonTableWrapper">
                  <h3>Детальное сравнение</h3>
                  <div className="forecastModernTableScroll">
                    <table className="forecastComparisonTable">
                      <thead>
                        <tr>
                          <th>Вариант</th>
                          <th>Взнос</th>
                          <th>Срок</th>
                          <th>Дата</th>
                          <th>Рост после инфляции</th>
                          <th>Вероятность</th>
                          <th>Риск</th>
                        </tr>
                      </thead>
                      <tbody>
                        {forecast.scenarios.map((scenario) => (
                          <tr key={scenario.id} className={scenario.name === forecast.optimalStrategy ? "optimalRow" : ""}>
                            <td data-label="Вариант">
                              <strong>{scenario.name}</strong>
                            </td>
                            <td data-label="Взнос">{formatCurrency(scenario.monthlyContribution)}</td>
                            <td data-label="Срок">{formatMonths(scenario.monthsToGoal)}</td>
                            <td data-label="Дата">{formatDate(scenario.predictedDate)}</td>
                            <td data-label="Рост после инфляции">{formatPercent(scenario.effectiveReturn)}%</td>
                            <td data-label="Вероятность">
                              <div className="confidenceBar">
                                <div className="confidenceFill" style={{ width: `${scenario.confidence}%` }} />
                                <span>{scenario.confidence}%</span>
                              </div>
                            </td>
                            <td data-label="Риск">
                              <span className={`riskBadge ${getRiskColor(scenario.risk)}`}>{scenario.risk}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              </div>
            )}

            <div className="recalculateSection">
              <button onClick={handleRecalculate} disabled={calculating} className="recalculateButton">
                <RefreshCw size={16} className={calculating ? "spinning" : ""} />
                {calculating ? "Пересчет..." : "Пересчитать прогноз"}
              </button>
              <Link to={`/scenarios/new/${selectedGoalId}`} className="createButton">
                <Plus size={16} />
                Добавить сценарий
              </Link>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}

function buildBaselineScenario(goal) {
  return {
    scenario_id: BASELINE_ID,
    name: "План цели без сценариев",
    monthly_contribution: Number(goal?.monthly_contribution || 0),
    expected_return: 0,
    inflation_rate: 0,
    target_amount: Number(goal?.target_amount || 0),
  };
}

function addMonths(date, months) {
  if (!Number.isFinite(months)) return null;
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result.toISOString().split("T")[0];
}

function buildSummary({ optimal, baseline, scenariosCount, progress }) {
  if (!Number.isFinite(baseline.monthsToGoal)) {
    return "По базовому плану цель не достигнется, потому что ежемесячный взнос равен нулю или слишком мал. Добавьте взнос в цель или создайте сценарий с другим платежом.";
  }

  if (scenariosCount === 0) {
    return `Сейчас показан базовый план цели: уже выполнено ${progress}%, при текущем взносе цель будет достигнута примерно через ${baseline.monthsToGoal} мес. Сценарии можно добавить отдельно, чтобы проверить другие суммы взноса или рост.`;
  }

  const fasterThanBaseline = optimal && optimal.name !== baseline.name && optimal.monthsToGoal < baseline.monthsToGoal;
  if (fasterThanBaseline) {
    const diff = baseline.monthsToGoal - optimal.monthsToGoal;
    return `Лучший сценарий ускоряет цель примерно на ${diff} мес. относительно базового плана. Базовая линия остается на графике, чтобы было понятно, что изменил сценарий.`;
  }

  return `Базовый план уже выглядит не хуже сценариев по сроку. Используйте сценарии как проверку: они помогают увидеть влияние другого взноса, инфляции и дополнительного роста.`;
}

function buildRecommendations({ baseline, optimal, scenariosCount }) {
  const items = [
    {
      tone: "success",
      title: "Сначала смотрите базовый план",
      text: "Это расчет только по данным цели: сколько уже накоплено и какой ежемесячный взнос указан в цели.",
    },
  ];

  if (optimal && optimal.name !== baseline.name) {
    items.push({
      tone: "success",
      title: "Есть сценарий быстрее базы",
      text: `${optimal.name} сокращает срок до ${optimal.monthsToGoal} мес. Проверьте, комфортен ли такой ежемесячный взнос.`,
    });
  }

  if (baseline.monthlyContribution <= 0) {
    items.push({
      tone: "warning",
      title: "Не хватает ежемесячного взноса",
      text: "Без регулярного взноса прогноз не сможет показать дату достижения цели.",
    });
  }

  if (scenariosCount === 0) {
    items.push({
      tone: "muted",
      title: "Сценарии не обязательны",
      text: "Страница уже работает без них. Сценарий нужен только если хотите проверить другой взнос, инфляцию или дополнительный рост.",
    });
  }

  if (optimal?.effectiveReturn < 0) {
    items.push({
      tone: "warning",
      title: "Рост ниже инфляции",
      text: "Если рост после инфляции отрицательный, накопления в реальном выражении теряют покупательную способность.",
    });
  }

  return items;
}

function generateTimelineData({ goal, scenariosForecast }) {
  const target = Number(goal?.target_amount || 0);
  const maxReachable = scenariosForecast
    .map((item) => item.monthsToGoal)
    .filter(Number.isFinite);
  const maxMonths = Math.min(120, Math.max(24, ...maxReachable, 24) + 6);
  const labels = [];

  for (let month = 0; month <= maxMonths; month += 3) {
    const date = new Date();
    date.setMonth(date.getMonth() + month);
    labels.push(date.toLocaleDateString("ru-RU", { month: "short", year: "numeric" }));
  }

  const datasets = scenariosForecast.map((scenario, index) => {
    const color = getScenarioColor(index);
    const data = labels.map((_, idx) => simulateAmount({
      start: scenario.current,
      monthly: scenario.monthlyContribution,
      annualRate: scenario.effectiveReturn,
      months: idx * 3,
    }));

    return {
      label: scenario.name,
      data,
      borderColor: color,
      backgroundColor: `${color}18`,
      borderWidth: scenario.isBaseline ? 4 : 2.5,
      borderDash: scenario.isBaseline ? [] : [0],
      tension: 0.42,
      pointRadius: 0,
      pointHoverRadius: 7,
      fill: scenario.isBaseline,
    };
  });

  datasets.push({
    label: "Целевая сумма",
    data: Array(labels.length).fill(target),
    borderColor: "#ff6b5f",
    borderWidth: 2,
    borderDash: [8, 8],
    pointRadius: 0,
    fill: false,
  });

  return { labels, datasets };
}

function simulateAmount({ start, monthly, annualRate, months }) {
  const monthlyRate = Math.pow(1 + Number(annualRate || 0) / 100, 1 / 12) - 1;
  let amount = Number(start || 0);

  for (let month = 0; month < months; month += 1) {
    amount = amount * (1 + monthlyRate) + Number(monthly || 0);
  }

  return Math.round(amount);
}

function getScenarioColor(index) {
  const colors = ["#495631", "#4f7cff", "#f0a13a", "#27a66a", "#ff6b5f", "#8b5cf6"];
  return colors[index % colors.length];
}

function getRiskIcon(risk) {
  if (risk === "Низкий") return <Shield size={14} />;
  if (risk === "Средний") return <Activity size={14} />;
  return <Zap size={14} />;
}

function getRiskColor(risk) {
  if (risk === "Низкий") return "riskLow";
  if (risk === "Средний") return "riskMedium";
  return "riskHigh";
}

function truncateLabel(label) {
  return label.length > 20 ? `${label.slice(0, 17)}...` : label;
}

export default ForecastPage;
