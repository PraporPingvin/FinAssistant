import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import Layout from "../../components/Layout";
import { getGoal, getScenarios, deleteScenario } from "../../api/api";
import "./ScenariosPage.css";

function ScenariosPage() {
  const { goalId } = useParams();
  const navigate = useNavigate();

  const [goal, setGoal] = useState(null);
  const [scenarios, setScenarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [sortBy, setSortBy] = useState("created_at");

  useEffect(() => {
    if (goalId) {
      loadData();
    } else {
      setError("Не выбрана цель для сценариев");
      setLoading(false);
    }
  }, [goalId]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError("");

      // Загружаем цель
      const goalData = await getGoal(goalId);

      if (!goalData) {
        setError("Цель не найдена");
        return;
      }

      setGoal(goalData);

      // Загружаем сценарии
      try {
        const scenariosData = await getScenarios(goalId);
        setScenarios(scenariosData || []);
      } catch (scenarioError) {
        console.error("Ошибка загрузки сценариев:", scenarioError);
        setScenarios([]);
      }

    } catch (error) {
      console.error("Ошибка загрузки данных:", error);
      setError(`Не удалось загрузить данные: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Фильтрация и сортировка сценариев
  const getFilteredScenarios = () => {
    let filtered = [...scenarios];

    // Фильтрация по статусу (если в будущем добавите статусы)
    if (filterStatus !== "all") {
      filtered = filtered.filter(scenario => scenario.status === filterStatus);
    }

    // Сортировка
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "created_at":
          return new Date(b.created_at || 0) - new Date(a.created_at || 0);
        case "name":
          return (a.name || "").localeCompare(b.name || "");
        case "expected_return":
          return (b.expected_return || 0) - (a.expected_return || 0);
        case "monthly_contribution":
          return (b.monthly_contribution || 0) - (a.monthly_contribution || 0);
        default:
          return 0;
      }
    });

    return filtered;
  };

  const handleCreateScenario = () => {
    navigate(`/scenarios/new/${goalId}`);
  };

  const handleRunForecast = (scenarioId) => {
    alert(`Запуск прогноза для сценария ${scenarioId}`);
    // В реальном приложении здесь будет вызов API
  };

  const handleCompareScenarios = () => {
    if (scenarios.length < 2) {
      alert("Для сравнения нужно как минимум 2 сценария");
      return;
    }
    navigate(`/scenarios/compare/${goalId}`);
  };

  const handleViewDetails = (scenario) => {
    navigate(`/scenarios/detail/${scenario.scenario_id}`);
  };

  const handleDeleteScenario = async (scenarioId, scenarioName) => {
    if (!window.confirm(`Вы уверены, что хотите удалить сценарий "${scenarioName}"?`)) {
      return;
    }

    try {
      setLoading(true);
      await deleteScenario(scenarioId);
      alert(`Сценарий "${scenarioName}" успешно удален!`);
      loadData(); // Перезагружаем список
    } catch (error) {
      console.error("Ошибка удаления сценария:", error);
      alert(`Не удалось удалить сценарий: ${error.message}`);
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

  const calculateMonthsToGoal = (scenario) => {
    if (!goal || !scenario) return 0;

    const target = parseFloat(goal.target_amount) || 0;
    const current = parseFloat(goal.current_amount) || 0;
    const monthly = parseFloat(scenario.monthly_contribution) || 0;

    if (monthly <= 0) return Infinity;

    const remaining = target - current;
    return Math.ceil(remaining / monthly);
  };

  const calculateRiskLevel = (expectedReturn) => {
    const returnValue = parseFloat(expectedReturn) || 0;
    if (returnValue < 5) return { level: "Низкий", color: "#4caf50", description: "Минимальный риск" };
    if (returnValue < 10) return { level: "Средний", color: "#ff9800", description: "Умеренный риск" };
    return { level: "Высокий", color: "#f44336", description: "Высокий риск" };
  };

  // Рассчитываем статистику по всем сценариям
  const calculateStats = () => {
    if (scenarios.length === 0) {
      return {
        total: 0,
        avgMonthly: 0,
        avgReturn: 0,
        minMonths: 0,
        maxMonths: 0
      };
    }

    const monthlyContributions = scenarios.map(s => parseFloat(s.monthly_contribution) || 0);
    const returns = scenarios.map(s => parseFloat(s.expected_return) || 0);
    const months = scenarios.map(s => calculateMonthsToGoal(s));

    return {
      total: scenarios.length,
      avgMonthly: Math.round(monthlyContributions.reduce((a, b) => a + b, 0) / scenarios.length),
      avgReturn: (returns.reduce((a, b) => a + b, 0) / scenarios.length).toFixed(1),
      minMonths: Math.min(...months.filter(m => isFinite(m))),
      maxMonths: Math.max(...months.filter(m => isFinite(m)))
    };
  };

  const stats = calculateStats();
  const filteredScenarios = getFilteredScenarios();

  if (loading) {
    return (
      <Layout>
        <div className="loadingContainer">
          <div className="loadingAnimation"></div>
          <p>Загружаем сценарии...</p>
        </div>
      </Layout>
    );
  }

  if (error || !goal) {
    return (
      <Layout>
        <div className="scenariosContainer">
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
      <div className="scenariosContainer">
        {/* Хлебные крошки */}
        <div className="breadcrumb">
          <Link to="/">Главная</Link>
          <span className="separator">›</span>
          <Link to="/goals">Цели</Link>
          <span className="separator">›</span>
          <Link to={`/goals/${goalId}`}>{goal.title}</Link>
          <span className="separator">›</span>
          <span>Сценарии</span>
        </div>

        {/* Заголовок */}
        <div className="pageHeaderScenarios">
          <div className="headerContent">
            <h1>Сценарии достижения цели</h1>
            <p>
              Создавайте и сравнивайте различные стратегии достижения вашей финансовой цели.
              Каждый сценарий представляет собой уникальный план с разными параметрами.
            </p>
          </div>

          <div className="actionsContainerScenariosPage">
            <button
              onClick={() => navigate(`/goals/${goalId}`)}
              className="actionButtonScenarios secondaryButtonScenarios"
            >
              ← К цели
            </button>
            <button
              onClick={handleCreateScenario}
              className="actionButtonScenarios primaryButtonScenarios"
            >
              ＋ Новый сценарий
            </button>
            {scenarios.length >= 2 && (
              <button
                onClick={handleCompareScenarios}
                className="actionButtonScenarios compareButtonScenarios"
              >
                📊 Сравнить сценарии
              </button>
            )}
          </div>
        </div>

        {/* Информация о цели */}
        <div className="goalInfoCard">
          <div className="goalInfoContent">
            <h3 className="goalInfoTitle">
              <span className="goalIcon">🎯</span>
              {goal.title}
            </h3>
            <div className="goalInfoStats">
              <div className="goalInfoStat">
                <div className="goalInfoLabel">Целевая сумма</div>
                <div className="goalInfoValue">{formatCurrency(goal.target_amount)} ₽</div>
              </div>
              <div className="goalInfoStat">
                <div className="goalInfoLabel">Текущая сумма</div>
                <div className="goalInfoValue">{formatCurrency(goal.current_amount)} ₽</div>
              </div>
              <div className="goalInfoStat">
                <div className="goalInfoLabel">Прогресс</div>
                <div className="goalInfoValue progressValue">
                  <div className="miniProgressBar">
                    <div
                      className="miniProgressFill"
                      style={{ width: `${Math.round((parseFloat(goal.current_amount) / parseFloat(goal.target_amount)) * 100)}%` }}
                    />
                  </div>
                  <span>{Math.round((parseFloat(goal.current_amount) / parseFloat(goal.target_amount)) * 100)}%</span>
                </div>
              </div>
              <div className="goalInfoStat">
                <div className="goalInfoLabel">Сценариев</div>
                <div className="goalInfoValue highlight">{scenarios.length}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Статистика по сценариям - показываем только если есть сценарии */}
        {scenarios.length > 0 && (
          <div className="scenariosStats">
            <h3 className="statsTitle">
              <span>📈</span>
              Статистика сценариев
            </h3>
            <div className="statsGrid">
              <div className="statCard">
                <div className="statIcon">📊</div>
                <div className="statValue">{stats.total}</div>
                <div className="statLabel">Всего сценариев</div>
              </div>
              <div className="statCard">
                <div className="statIcon">💰</div>
                <div className="statValue">{formatCurrency(stats.avgMonthly)} ₽</div>
                <div className="statLabel">Средний взнос в месяц</div>
              </div>
              <div className="statCard">
                <div className="statIcon">📈</div>
                <div className="statValue">{stats.avgReturn}%</div>
                <div className="statLabel">Средняя доходность</div>
              </div>
              <div className="statCard">
                <div className="statIcon">⏱️</div>
                <div className="statValue">
                  {stats.minMonths}-{stats.maxMonths} мес
                </div>
                <div className="statLabel">Диапазон сроков</div>
              </div>
            </div>
          </div>
        )}

        {/* Фильтры и сортировка - показываем только если есть сценарии */}
        {scenarios.length > 0 && (
          <div className="filtersContainer">
            <div className="filterGroup">
              <span className="filterLabel">Сортировка:</span>
              <select
                className="filterSelect"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="created_at">По дате создания (новые)</option>
                <option value="name">По названию (А-Я)</option>
                <option value="expected_return">По доходности (высокая)</option>
                <option value="monthly_contribution">По взносу (большой)</option>
              </select>
            </div>

            <div className="refreshButtonContainer">
              <button
                onClick={loadData}
                className="refreshButton"
                title="Обновить список"
              >
                ⟳ Обновить
              </button>
            </div>
          </div>
        )}

        {/* Сообщение об ошибке */}
        {error && (
          <div className="errorMessage">
            <strong>Внимание:</strong> {error}
          </div>
        )}

        {/* Список сценариев или пустое состояние */}
        {scenarios.length > 0 ? (
          <div className="scenariosListAll">
            <h3 className="listTitle">
              <span>📋</span>
              Список созданных сценариев

            </h3>

            <div className="scenariosGrid">
              {filteredScenarios.map((scenario, index) => {
                const monthsToGoal = calculateMonthsToGoal(scenario);
                const risk = calculateRiskLevel(scenario.expected_return);

                return (
                  <div
                    key={scenario.scenario_id || index}
                    className="scenarioCard"
                    onClick={() => handleViewDetails(scenario)}
                  >
                    <div className="scenarioCardHeader">
                      <div className="scenarioTitleSection">
                        <h4 className="scenarioCardTitle">
                          {scenario.name || `Сценарий ${index + 1}`}
                        </h4>

                      </div>
                      <div className="scenarioActions">
                        <button
                          className="scenarioActionButton smallButton"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/scenarios/edit/${scenario.scenario_id}`);
                          }}
                          title="Редактировать сценарий"
                        >
                          ✏️
                        </button>
                        <button
                          className="scenarioActionButton smallButton"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/scenarios/detail/${scenario.scenario_id}`);
                          }}
                          title="Просмотреть детали"
                        >
                          👁️
                        </button>
                        <button
                          className="scenarioActionButton smallButton deleteButton"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteScenario(scenario.scenario_id, scenario.name);
                          }}
                          title="Удалить сценарий"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>

                    <div className="scenarioContent">
                      <div className="scenarioMainInfoPage">
                        <div className="infoRow">
                          <span className="infoLabel">Ежемесячный взнос:</span>
                          <span className="infoValue highlight">
                            {formatCurrency(scenario.monthly_contribution)} ₽
                          </span>
                        </div>
                        <div className="infoRow">
                          <span className="infoLabel">Ожидаемая доходность:</span>
                          <span className="infoValue">
                            {scenario.expected_return}%
                          </span>
                        </div>
                        <div className="infoRow">
                          <span className="infoLabel">Инфляция:</span>
                          <span className="infoValue">
                            {scenario.inflation_rate}%
                          </span>
                        </div>
                      </div>

                      <div className="scenarioCalculations">
                        <div className="calculationRow">
                          <span className="calculationLabel">Срок достижения:</span>
                          <span className="calculationValue">
                            {isFinite(monthsToGoal) ? (
                              <>
                                <strong>{monthsToGoal}</strong> месяцев
                                <span className="subText">
                                  ({Math.floor(monthsToGoal / 12)} г. {monthsToGoal % 12} мес.)
                                </span>
                              </>
                            ) : (
                              <span className="warningText">Недостижимо</span>
                            )}
                          </span>
                        </div>

                        <div className="calculationRow">
                          <span className="calculationLabel">Уровень риска:</span>
                          <span className="calculationValue">
                            <span
                              className="riskBadge"
                              style={{ backgroundColor: risk.color }}
                            >
                              {risk.level}
                            </span>
                            <span className="riskDescription">{risk.description}</span>
                          </span>
                        </div>

                        <div className="calculationRow">
                          <span className="calculationLabel">Эффективная доходность:</span>
                          <span className="calculationValue">
                            <strong>
                              {(parseFloat(scenario.expected_return || 0) - parseFloat(scenario.inflation_rate || 0)).toFixed(1)}%
                            </strong>
                            <span className="subText">(с учетом инфляции)</span>
                          </span>
                        </div>
                      </div>

                      <div className="scenarioMeta">
                        <div className="metaRow">
                          <span className="metaLabel">Создан:</span>
                          <span className="metaValue">
                            {formatDate(scenario.created_at)}
                          </span>
                        </div>
                        <div className="metaRow">
                          <span className="metaLabel">Целевая сумма:</span>
                          <span className="metaValue">
                            {formatCurrency(scenario.target_amount || goal.target_amount)} ₽
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="scenarioProgress">
                      <div className="progressLabel">Прогресс через 12 месяцев:</div>
                      <div className="progressBar">
                        <div
                          className="progressFill"
                          style={{
                            width: `${Math.min(100,
                              ((parseFloat(goal.current_amount || 0) +
                                (parseFloat(scenario.monthly_contribution || 0) * 12)) /
                                parseFloat(goal.target_amount || 1)) * 100)}%`
                          }}
                        />
                      </div>
                      <div className="progressText">
                        {formatCurrency(
                          parseFloat(goal.current_amount || 0) +
                          (parseFloat(scenario.monthly_contribution || 0) * 12)
                        )} ₽
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="emptyState">
            <div className="emptyStateIcon">📋</div>
            <h3>Сценариев пока нет</h3>
            <p>
              Создайте первый сценарий для анализа различных стратегий
              достижения вашей финансовой цели. Сценарий поможет определить
              оптимальный план накоплений.
            </p>
            <button
              onClick={handleCreateScenario}
              className="actionButtonScenarios createFirstButton"
            >
              ＋ Создать первый сценарий
            </button>

            {/* Подсказки показываем ТОЛЬКО когда нет сценариев */}
            <div className="emptyStateTips">
              <h4>💡 Советы по созданию сценариев:</h4>
              <ul>
                <li>
                  <span className="tipBadge conservative">Консервативный</span>
                  Низкий риск (5-7%), стабильный доход
                </li>
                <li>
                  <span className="tipBadge moderate">Умеренный</span>
                  Средний риск (7-10%), баланс доходности и безопасности
                </li>
                <li>
                  <span className="tipBadge aggressive">Агрессивный</span>
                  Высокий риск (10%+), максимальная доходность
                </li>
              </ul>
            </div>
          </div>
        )}


      </div>
    </Layout>
  );
}

export default ScenariosPage;