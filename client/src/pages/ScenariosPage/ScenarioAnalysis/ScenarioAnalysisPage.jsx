import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
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
      
      // Автоматический анализ, если есть сценарии
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
    
    // Анализируем каждый сценарий
    const analyzedScenarios = scenariosList.map(scenario => {
      const monthlyContribution = parseFloat(scenario.monthly_contribution) || 0;
      const expectedReturn = parseFloat(scenario.expected_return) || 0;
      const inflationRate = parseFloat(scenario.inflation_rate) || 0;
      
      // Расчет месяцев до цели
      const monthsToGoal = monthlyContribution > 0 
        ? Math.ceil(remainingAmount / monthlyContribution)
        : Infinity;
      
      // Расчет эффективной доходности (с учетом инфляции)
      const effectiveReturn = expectedReturn - inflationRate;
      
      // Оценка риска
      let riskLevel = "Низкий";
      let riskColor = "#4caf50";
      if (expectedReturn > 15) {
        riskLevel = "Высокий";
        riskColor = "#f44336";
      } else if (expectedReturn > 8) {
        riskLevel = "Средний";
        riskColor = "#ff9800";
      }
      
      // Вероятность достижения цели (0-100%)
      let probability = 100;
      if (monthsToGoal > 120) probability = 30; // Более 10 лет
      else if (monthsToGoal > 60) probability = 60; // 5-10 лет
      else if (monthsToGoal > 36) probability = 80; // 3-5 лет
      
      // Оценка реалистичности
      let feasibility = "Высокая";
      if (expectedReturn > 20) feasibility = "Низкая";
      else if (expectedReturn > 12) feasibility = "Средняя";
      
      return {
        ...scenario,
        monthsToGoal,
        effectiveReturn,
        riskLevel,
        riskColor,
        probability,
        feasibility,
        monthlyContribution
      };
    });
    
    // Находим оптимальный сценарий (баланс срок/риск/вероятность)
    const optimalScenario = analyzedScenarios.reduce((best, current) => {
      if (!best) return current;
      
      // Скоринг: меньше месяцев + выше вероятность + ниже риск
      const bestScore = (1 / best.monthsToGoal) * best.probability / 
                       (best.riskLevel === "Высокий" ? 3 : best.riskLevel === "Средний" ? 2 : 1);
      const currentScore = (1 / current.monthsToGoal) * current.probability / 
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
      
      // Сброс формы
      setNewScenario({
        name: "",
        monthly_contribution: "",
        expected_return: "7.5",
        inflation_rate: "6.0"
      });
      setShowCreateForm(false);
      
      // Перезагрузка данных
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

  const calculateTimeToGoal = (monthlyContribution) => {
    if (!analysis || !monthlyContribution) return 0;
    
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
          <div className="loadingAnimation"></div>
          <p>Загружаем анализ сценариев...</p>
        </div>
      </Layout>
    );
  }

  if (error || !goal) {
    return (
      <Layout>
        <div className="scenarioAnalysisContainer">
          <div className="errorMessage">
            <strong>Внимание:</strong> {error || "Цель не найдена"}
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
      <div className="scenarioAnalysisContainer">
        {/* Хлебные крошки */}
        <div className="breadcrumb">
          <Link to="/">Главная</Link>
          {" > "}
          <Link to="/goals">Цели</Link>
          {" > "}
          <Link to={`/goals/${goalId}`}>{goal.title}</Link>
          {" > "}
          <span>Анализ сценариев</span>
        </div>

        {/* Заголовок */}
        <div className="pageHeader">
          <div className="headerContent">
            <h1>Анализ сценариев достижения цели</h1>
            <p>Сравните различные стратегии и найдите оптимальный путь к вашей цели</p>
          </div>
          
          <div className="actionsContainer">
            <button
              onClick={() => navigate(`/goals/${goalId}`)}
              className="actionButton secondaryButton"
            >
              ← К цели
            </button>
            <button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="actionButton primaryButton"
            >
              {showCreateForm ? "✖️ Скрыть форму" : "＋ Новый сценарий"}
            </button>
          </div>
        </div>

        {/* Информация о цели */}
        <div className="goalInfoCard">
          <h3>🎯 Цель: {goal.title}</h3>
          <div className="goalInfoGrid">
            <div className="infoItem">
              <span className="infoLabel">Целевая сумма:</span>
              <span className="infoValue">{formatCurrency(goal.target_amount)} ₽</span>
            </div>
            <div className="infoItem">
              <span className="infoLabel">Текущая сумма:</span>
              <span className="infoValue">{formatCurrency(goal.current_amount)} ₽</span>
            </div>
            <div className="infoItem">
              <span className="infoLabel">Прогресс:</span>
              <span className="infoValue">
                {analysis ? analysis.progressPercentage.toFixed(1) : "0"}%
              </span>
            </div>
            <div className="infoItem">
              <span className="infoLabel">Осталось:</span>
              <span className="infoValue highlight">
                {analysis ? formatCurrency(analysis.remainingAmount) : "0"} ₽
              </span>
            </div>
          </div>
        </div>

        {/* Форма создания сценария */}
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
                  <label>Ежемесячный взнос (₽) *</label>
                  <input
                    type="number"
                    value={newScenario.monthly_contribution}
                    onChange={(e) => setNewScenario({...newScenario, monthly_contribution: e.target.value})}
                    placeholder="15000"
                    required
                    min="1000"
                  />
                </div>
              </div>
              
              <div className="formRow">
                <div className="formGroup">
                  <label>Ожидаемая доходность (%)</label>
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
                  <label>Инфляция (%)</label>
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
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="secondaryButton"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="primaryButton"
                  disabled={loading}
                >
                  {loading ? "Создание..." : "Создать сценарий"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Анализ сценариев */}
        {analysis && analysis.optimalScenario && (
          <div className="optimalScenarioCard">
            <h3>⭐ Оптимальный сценарий</h3>
            <div className="optimalScenarioContent">
              <div className="scenarioName">
                <h4>{analysis.optimalScenario.name}</h4>
                <span className="scenarioTag" style={{backgroundColor: analysis.optimalScenario.riskColor}}>
                  {analysis.optimalScenario.riskLevel} риск
                </span>
              </div>
              
              <div className="scenarioStats">
                <div className="stat">
                  <div className="statLabel">Месяцев до цели</div>
                  <div className="statValue">{analysis.optimalScenario.monthsToGoal}</div>
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

        {/* Таблица сравнения сценариев */}
        <div className="scenariosComparison">
          <h3>📊 Сравнение сценариев</h3>
          
          {analysis && analysis.scenarios.length > 0 ? (
            <div className="comparisonTable">
              <table>
                <thead>
                  <tr>
                    <th>Сценарий</th>
                    <th>Ежемесячный взнос</th>
                    <th>Доходность</th>
                    <th>Месяцев до цели</th>
                    <th>Вероятность</th>
                    <th>Уровень риска</th>
                    <th>Действия</th>
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
                            <span className="optimalBadge">⭐ Оптимальный</span>
                          )}
                        </td>
                        <td>{formatCurrency(scenario.monthlyContribution)} ₽</td>
                        <td>{scenario.expected_return}%</td>
                        <td>
                          <strong>{scenario.monthsToGoal}</strong>
                          <div className="subText">
                            {time.years > 0 && `${time.years} г. `}
                            {time.monthsRemainder > 0 && `${time.monthsRemainder} мес.`}
                          </div>
                        </td>
                        <td>
                          <div className="probabilityBar">
                            <div 
                              className="probabilityFill"
                              style={{width: `${scenario.probability}%`}}
                            />
                            <span>{scenario.probability}%</span>
                          </div>
                        </td>
                        <td>
                          <span 
                            className="riskTag"
                            style={{backgroundColor: scenario.riskColor}}
                          >
                            {scenario.riskLevel}
                          </span>
                        </td>
                        <td>
                          <button
                            className="actionButton smallButton"
                            onClick={() => navigate(`/scenarios/${goalId}`)}
                          >
                            📈 Детали
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

        {/* Рекомендации */}
        <div className="recommendationsSection">
          <h3>💡 Рекомендации</h3>
          <div className="recommendationsGrid">
            <div className="recommendationCard">
              <h4>🎯 Фокус на цели</h4>
              <p>
                Текущий прогресс: <strong>{analysis?.progressPercentage.toFixed(1) || 0}%</strong><br/>
                Для достижения цели осталось накопить: <strong>{formatCurrency(analysis?.remainingAmount || 0)} ₽</strong>
              </p>
            </div>
            
            <div className="recommendationCard">
              <h4>⏱️ Временные рамки</h4>
              <p>
                {analysis?.optimalScenario ? (
                  <>При оптимальном сценарии цель будет достигнута за <strong>{analysis.optimalScenario.monthsToGoal} месяцев</strong></>
                ) : (
                  "Создайте сценарий для оценки сроков"
                )}
              </p>
            </div>
            
            <div className="recommendationCard">
              <h4>📈 Стратегия</h4>
              <p>
                {analysis?.optimalScenario ? (
                  <>Рекомендуется <strong>{analysis.optimalScenario.name}</strong> с умеренным уровнем риска</>
                ) : (
                  "Начните с консервативного сценария с низким уровнем риска"
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Кнопка обновления */}
        <div className="refreshSection">
          <button
            onClick={loadData}
            className="refreshButton"
            disabled={loading}
          >
            ⟳ Обновить анализ
          </button>
        </div>
      </div>
    </Layout>
  );
}

export default ScenarioAnalysisPage;