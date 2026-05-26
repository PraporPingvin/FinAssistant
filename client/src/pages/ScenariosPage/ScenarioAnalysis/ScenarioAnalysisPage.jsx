import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  ArrowLeft,
  Home,
  Target,
  BarChart3,
  Plus,
  X,
  RefreshCw,
  TrendingUp,
  DollarSign,
  Calendar,
  Clock,
  Shield,
  Zap,
  Activity,
  Star,
  AlertCircle,
  ChevronRight,
} from "lucide-react";
import Layout from "../../../components/Layout";
import { 
  getGoal, 
  getScenarios, 
  createScenario,
  getForecast 
} from "../../../api/api";
import "./ScenarioAnalysisPage.css";

function ScenarioAnalysisPage() {
  const { goalId } = useParams();
  const navigate = useNavigate();
  
  const [goal, setGoal] = useState(null);
  const [scenarios, setScenarios] = useState([]);
  const [forecast, setForecast] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newScenario, setNewScenario] = useState({
    name: "",
    monthly_contribution: "",
    expected_return: "7.5",
    inflation_rate: "6.0"
  });
  const [analysis, setAnalysis] = useState(null);

  useEffect(() => {
    if (goalId) {
      loadData();
    }
  }, [goalId]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError("");
      
      const [goalData, scenariosData, forecastData] = await Promise.all([
        getGoal(goalId),
        getScenarios(goalId),
        getForecast(goalId).catch(() => null)
      ]);
      
      if (!goalData) {
        setError("Цель не найдена");
        return;
      }
      
      setGoal(goalData);
      setScenarios(scenariosData);
      setForecast(forecastData);
      
      if (scenariosData.length > 0) {
        performAnalysis(scenariosData, goalData);
      }
      
    } catch (error) {
      console.error("Ошибка загрузки данных:", error);
      setError(`Не удалось загрузить данные: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const performAnalysis = (scenariosList, goalData) => {
    if (!scenariosList || scenariosList.length === 0) return;
    
    const targetAmount = parseFloat(goalData.target_amount) || 0;
    const currentAmount = parseFloat(goalData.current_amount) || 0;
    const remainingAmount = targetAmount - currentAmount;
    
    const analyzedScenarios = scenariosList.map(scenario => {
      const monthlyContribution = parseFloat(scenario.monthly_contribution) || 0;
      const expectedReturn = parseFloat(scenario.expected_return) || 0;
      const inflationRate = parseFloat(scenario.inflation_rate) || 0;
      
      const monthsToGoal = monthlyContribution > 0 && remainingAmount > 0
        ? Math.ceil(remainingAmount / monthlyContribution)
        : Infinity;
      
      const effectiveReturn = expectedReturn - inflationRate;
      
      let riskLevel = "Низкий";
      let riskColor = "#2E7D32";
      let riskIcon = <Shield size={14} />;
      if (expectedReturn > 15) {
        riskLevel = "Высокий";
        riskColor = "#E35D5D";
        riskIcon = <Zap size={14} />;
      } else if (expectedReturn > 8) {
        riskLevel = "Средний";
        riskColor = "#F5A623";
        riskIcon = <Activity size={14} />;
      }
      
      let probability = 100;
      if (monthsToGoal > 120) probability = 30;
      else if (monthsToGoal > 60) probability = 60;
      else if (monthsToGoal > 36) probability = 80;
      
      let feasibility = "Высокая";
      if (expectedReturn > 20) feasibility = "Низкая";
      else if (expectedReturn > 12) feasibility = "Средняя";
      
      return {
        ...scenario,
        monthsToGoal: isFinite(monthsToGoal) ? monthsToGoal : 0,
        effectiveReturn,
        riskLevel,
        riskColor,
        riskIcon,
        probability,
        feasibility,
        monthlyContribution
      };
    });
    
    const optimalScenario = analyzedScenarios.reduce((best, current) => {
      if (!best) return current;
      
      const bestScore = (1 / (best.monthsToGoal || 1)) * (best.probability / 100) / 
                       (best.riskLevel === "Высокий" ? 3 : best.riskLevel === "Средний" ? 2 : 1);
      const currentScore = (1 / (current.monthsToGoal || 1)) * (current.probability / 100) / 
                          (current.riskLevel === "Высокий" ? 3 : current.riskLevel === "Средний" ? 2 : 1);
      
      return currentScore > bestScore ? current : best;
    }, null);
    
    setAnalysis({
      scenarios: analyzedScenarios,
      optimalScenario,
      targetAmount,
      currentAmount,
      remainingAmount,
      progressPercentage: targetAmount > 0 ? (currentAmount / targetAmount) * 100 : 0
    });
  };

  const handleCreateScenario = async (e) => {
    e.preventDefault();
    
    if (!newScenario.name || !newScenario.monthly_contribution) {
      setError("Заполните обязательные поля");
      return;
    }
    
    try {
      setLoading(true);
      const scenarioData = {
        goal_id: parseInt(goalId),
        name: newScenario.name,
        monthly_contribution: parseFloat(newScenario.monthly_contribution),
        expected_return: parseFloat(newScenario.expected_return),
        inflation_rate: parseFloat(newScenario.inflation_rate),
        target_amount: goal.target_amount
      };
      
      await createScenario(scenarioData);
      
      setNewScenario({
        name: "",
        monthly_contribution: "",
        expected_return: "7.5",
        inflation_rate: "6.0"
      });
      setShowCreateForm(false);
      await loadData();
      
    } catch (error) {
      console.error("Ошибка создания сценария:", error);
      setError(`Ошибка создания сценария: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    const num = parseFloat(amount) || 0;
    return new Intl.NumberFormat('ru-RU').format(num);
  };

  const calculateTimeToGoal = (monthlyContribution) => {
    if (!analysis || !monthlyContribution) return { months: 0, years: 0, monthsRemainder: 0 };
    
    const months = analysis.remainingAmount > 0 && monthlyContribution > 0
      ? Math.ceil(analysis.remainingAmount / monthlyContribution)
      : 0;
    
    return {
      months,
      years: Math.floor(months / 12),
      monthsRemainder: months % 12
    };
  };

  if (loading) {
    return (
      <Layout>
        <div className="loadingContainer">
          <div className="loadingAnimation" />
          <p>Загружаем анализ сценариев...</p>
        </div>
      </Layout>
    );
  }

  if (error || !goal) {
    return (
      <Layout>
        <div className="scenarioAnalysisPage">
          <div className="errorMessage">
            <AlertCircle size={18} />
            <span>{error || "Цель не найдена"}</span>
          </div>
          <Link to="/goals" className="backButton">
            ← Вернуться к списку целей
          </Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="scenarioAnalysisPage">
        <div className="breadcrumb">
          <Link to="/"><Home size={14} /> Главная</Link>
          <span>/</span>
          <Link to="/goals"><Target size={14} /> Цели</Link>
          <span>/</span>
          <Link to={`/goals/${goalId}`}>{goal.title}</Link>
          <span>/</span>
          <span className="current">Анализ сценариев</span>
        </div>

        <div className="pageHeaderScenarioAnalysis">
          <div className="headerContent">
            <h1>Анализ сценариев достижения цели</h1>
            <p>Сравните различные стратегии и найдите оптимальный путь к вашей цели</p>
          </div>
          
          <div className="actionsContainer">
            <button onClick={() => navigate(`/goals/${goalId}`)} className="actionButton secondaryButton">
              <ArrowLeft size={14} />
              К цели
            </button>
            <button onClick={() => setShowCreateForm(!showCreateForm)} className="actionButton primaryButton">
              {showCreateForm ? <X size={14} /> : <Plus size={14} />}
              {showCreateForm ? "Скрыть форму" : "Новый сценарий"}
            </button>
          </div>
        </div>

        <div className="goalInfoCard">
          <h3>
            <Target size={20} />
            Цель: {goal.title}
          </h3>
          <div className="goalInfoGrid">
            <div className="infoItem">
              <span className="infoLabel">Целевая сумма</span>
              <span className="infoValue">{formatCurrency(goal.target_amount)} ₽</span>
            </div>
            <div className="infoItem">
              <span className="infoLabel">Текущая сумма</span>
              <span className="infoValue">{formatCurrency(goal.current_amount)} ₽</span>
            </div>
            <div className="infoItem">
              <span className="infoLabel">Прогресс</span>
              <span className="infoValue">{analysis ? analysis.progressPercentage.toFixed(1) : "0"}%</span>
            </div>
            <div className="infoItem">
              <span className="infoLabel">Осталось накопить</span>
              <span className="infoValue highlight">{analysis ? formatCurrency(analysis.remainingAmount) : "0"} ₽</span>
            </div>
          </div>
        </div>

        {showCreateForm && (
          <div className="createScenarioForm">
            <h3>Создать новый сценарий</h3>
            <form onSubmit={handleCreateScenario}>
              <div className="formRow">
                <div className="formGroup">
                  <label>Название сценария *</label>
                  <input
                    type="text"
                    value={newScenario.name}
                    onChange={(e) => setNewScenario({...newScenario, name: e.target.value})}
                    placeholder="Например: Консервативный план"
                    required
                  />
                </div>
                <div className="formGroup">
                  <label>
                    <DollarSign size={14} />
                    Ежемесячный взнос (₽) *
                  </label>
                  <input
                    type="number"
                    value={newScenario.monthly_contribution}
                    onChange={(e) => setNewScenario({...newScenario, monthly_contribution: e.target.value})}
                    placeholder="15 000"
                    required
                    min="1000"
                  />
                </div>
              </div>
              
              <div className="formRow">
                <div className="formGroup">
                  <label>
                    <TrendingUp size={14} />
                    Ожидаемая доходность (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={newScenario.expected_return}
                    onChange={(e) => setNewScenario({...newScenario, expected_return: e.target.value})}
                    placeholder="7.5"
                    min="0"
                    max="30"
                  />
                </div>
                <div className="formGroup">
                  <label>
                    <Activity size={14} />
                    Инфляция (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={newScenario.inflation_rate}
                    onChange={(e) => setNewScenario({...newScenario, inflation_rate: e.target.value})}
                    placeholder="6.0"
                    min="0"
                    max="20"
                  />
                </div>
              </div>
              
              <div className="formButtons">
                <button type="button" onClick={() => setShowCreateForm(false)} className="actionButton secondaryButton">
                  <X size={14} />
                  Отмена
                </button>
                <button type="submit" className="actionButton primaryButton" disabled={loading}>
                  <Plus size={14} />
                  {loading ? "Создание..." : "Создать сценарий"}
                </button>
              </div>
            </form>
          </div>
        )}

        {analysis && analysis.optimalScenario && (
          <div className="optimalScenarioCard">
            <h3>
              <Star size={18} />
              Оптимальный сценарий
            </h3>
            <div className="optimalScenarioContent">
              <div className="scenarioName">
                <h4>{analysis.optimalScenario.name}</h4>
                <span className="scenarioTag" style={{ backgroundColor: analysis.optimalScenario.riskColor }}>
                  {analysis.optimalScenario.riskIcon} {analysis.optimalScenario.riskLevel} риск
                </span>
              </div>
              
              <div className="scenarioStats">
                <div className="stat">
                  <div className="statLabel">Срок достижения</div>
                  <div className="statValue">{analysis.optimalScenario.monthsToGoal} мес.</div>
                </div>
                <div className="stat">
                  <div className="statLabel">Вероятность</div>
                  <div className="statValue">{analysis.optimalScenario.probability}%</div>
                </div>
                <div className="stat">
                  <div className="statLabel">Эффективная доходность</div>
                  <div className="statValue">{analysis.optimalScenario.effectiveReturn.toFixed(1)}%</div>
                </div>
                <div className="stat">
                  <div className="statLabel">Реалистичность</div>
                  <div className="statValue">{analysis.optimalScenario.feasibility}</div>
                </div>
              </div>
              
              <div className="scenarioDetails">
                <p><strong>Ежемесячный взнос:</strong> {formatCurrency(analysis.optimalScenario.monthlyContribution)} ₽</p>
                <p><strong>Ожидаемая доходность:</strong> {analysis.optimalScenario.expected_return}%</p>
                <p><strong>Инфляция:</strong> {analysis.optimalScenario.inflation_rate}%</p>
              </div>
            </div>
          </div>
        )}

        <div className="scenariosComparison">
          <h3>
            <BarChart3 size={18} />
            Сравнение сценариев
          </h3>
          
          {analysis && analysis.scenarios.length > 0 ? (
            <div className="comparisonTable">
              <table>
                <thead>
                  <tr>
                    <th>Сценарий</th>
                    <th>Взнос</th>
                    <th>Доходность</th>
                    <th>Срок</th>
                    <th>Вероятность</th>
                    <th>Риск</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {analysis.scenarios.map((scenario, index) => {
                    const time = calculateTimeToGoal(scenario.monthlyContribution);
                    
                    return (
                      <tr key={scenario.scenario_id || index}>
                        <td>
                          <strong>{scenario.name}</strong>
                          {scenario.scenario_id === analysis.optimalScenario?.scenario_id && (
                            <span className="optimalBadge">Оптимальный</span>
                          )}
                        </td>
                        <td>{formatCurrency(scenario.monthlyContribution)} ₽</td>
                        <td>{scenario.expected_return}%</td>
                        <td>
                          <strong>{scenario.monthsToGoal}</strong> мес.
                          <div className="subText">
                            {time.years > 0 && `${time.years} г. `}
                            {time.monthsRemainder > 0 && `${time.monthsRemainder} мес.`}
                          </div>
                        </td>
                        <td>
                          <div className="probabilityBar">
                            <div className="probabilityFill" style={{ width: `${scenario.probability}%` }} />
                            <span>{scenario.probability}%</span>
                          </div>
                        </td>
                        <td>
                          <span className="riskTag" style={{ backgroundColor: scenario.riskColor }}>
                            {scenario.riskIcon} {scenario.riskLevel}
                          </span>
                        </td>
                        <td>
                          <button
                            className="actionButton smallButton secondaryButton"
                            onClick={() => navigate(`/scenarios/${goalId}`)}
                          >
                            <ChevronRight size={14} />
                            Детали
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="emptyState">
              <p>Сценариев пока нет. Создайте первый сценарий для анализа.</p>
            </div>
          )}
        </div>

        <div className="recommendationsSection">
          <h3>Рекомендации</h3>
          <div className="recommendationsGrid">
            <div className="recommendationCard">
              <h4>
                <Target size={16} />
                Фокус на цели
              </h4>
              <p>
                Текущий прогресс: <strong>{analysis?.progressPercentage.toFixed(1) || 0}%</strong><br/>
                Для достижения цели осталось накопить: <strong>{formatCurrency(analysis?.remainingAmount || 0)} ₽</strong>
              </p>
            </div>
            
            <div className="recommendationCard">
              <h4>
                <Clock size={16} />
                Временные рамки
              </h4>
              <p>
                {analysis?.optimalScenario ? (
                  <>При оптимальном сценарии цель будет достигнута за <strong>{analysis.optimalScenario.monthsToGoal} месяцев</strong></>
                ) : (
                  "Создайте сценарий для оценки сроков"
                )}
              </p>
            </div>
            
            <div className="recommendationCard">
              <h4>
                <Shield size={16} />
                Стратегия
              </h4>
              <p>
                {analysis?.optimalScenario ? (
                  <>Рекомендуется <strong>{analysis.optimalScenario.name}</strong> с {analysis.optimalScenario.riskLevel.toLowerCase()} уровнем риска</>
                ) : (
                  "Начните с консервативного сценария с низким уровнем риска"
                )}
              </p>
            </div>
          </div>
        </div>

        <div className="refreshSection">
          <button onClick={loadData} className="refreshButton" disabled={loading}>
            <RefreshCw size={14} className={loading ? "spinning" : ""} />
            Обновить анализ
          </button>
        </div>
      </div>
    </Layout>
  );
}

export default ScenarioAnalysisPage;