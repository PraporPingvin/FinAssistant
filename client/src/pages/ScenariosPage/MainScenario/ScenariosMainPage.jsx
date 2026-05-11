import React, { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import Layout from "../../../components/Layout";
import { getGoals, getScenarios } from "../../../api/api";
import { useAuth } from "../../../context/AuthContext";
import "./ScenariosMainPage.css";

function ScenariosMainPage() {
  const navigate = useNavigate();

  const [goals, setGoals] = useState([]);
  const [allScenarios, setAllScenarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [sortBy, setSortBy] = useState("progress");
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedGoal, setExpandedGoal] = useState(null);
  // Состояние для открытия/закрытия секции со сценариями
  const [isScenariosExpanded, setIsScenariosExpanded] = useState(false);

  const { user } = useAuth();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError("");

      // Загружаем все цели
      const goalsData = await getGoals();
      setGoals(goalsData);

      // Загружаем сценарии для всех целей
      const scenariosPromises = goalsData.map(goal =>
        getScenarios(goal.goal_id).catch(() => [])
      );

      const scenariosResults = await Promise.all(scenariosPromises);

      // Собираем все сценарии с информацией о цели
      const allScenariosWithGoal = [];
      goalsData.forEach((goal, index) => {
        const goalScenarios = scenariosResults[index] || [];
        goalScenarios.forEach(scenario => {
          allScenariosWithGoal.push({
            ...scenario,
            goal_id: goal.goal_id,
            goal_title: goal.title,
            goal_progress: Math.round((parseFloat(goal.current_amount) / parseFloat(goal.target_amount)) * 100)
          });
        });
      });

      setAllScenarios(allScenariosWithGoal);

    } catch (error) {
      console.error("Ошибка загрузки данных:", error);
      setError(`Не удалось загрузить данные: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Фильтрация целей
  const getFilteredGoals = () => {
    let filtered = [...goals];

    // Фильтрация по статусу
    if (filterStatus !== "all") {
      filtered = filtered.filter(goal => goal.status === filterStatus);
    }

    // Поиск
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(goal =>
        goal.title.toLowerCase().includes(term) ||
        goal.description?.toLowerCase().includes(term)
      );
    }

    // Сортировка
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "progress":
          const progressA = (parseFloat(a.current_amount) / parseFloat(a.target_amount)) * 100;
          const progressB = (parseFloat(b.current_amount) / parseFloat(b.target_amount)) * 100;
          return progressB - progressA;
        case "target_amount":
          return parseFloat(b.target_amount) - parseFloat(a.target_amount);
        case "created_at":
          return new Date(b.created_at || 0) - new Date(a.created_at || 0);
        case "title":
          return (a.title || "").localeCompare(b.title || "");
        default:
          return 0;
      }
    });

    return filtered;
  };

  // Фильтрация всех сценариев
  const getFilteredScenarios = () => {
    let filtered = [...allScenarios];

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(scenario =>
        scenario.name?.toLowerCase().includes(term) ||
        scenario.goal_title.toLowerCase().includes(term)
      );
    }

    return filtered;
  };

  const handleGoalClick = (goalId) => {
    setExpandedGoal(expandedGoal === goalId ? null : goalId);
  };

  const handleViewScenarios = (goalId, goalTitle) => {
    navigate(`/scenarios/${goalId}`);
  };

  const handleViewScenarioDetails = (scenarioId) => {
    navigate(`/scenarios/detail/${scenarioId}`);
  };

  const handleCreateGoal = () => {
    navigate("/goals/new");
  };

  const handleClearFilters = () => {
    setFilterStatus("all");
    setSortBy("progress");
    setSearchTerm("");
  };

  // Функция для переключения секции сценариев
  const toggleScenariosSection = () => {
    setIsScenariosExpanded(!isScenariosExpanded);
  };

  const formatCurrency = (amount) => {
    const num = parseFloat(amount) || 0;
    return new Intl.NumberFormat('ru-RU').format(num);
  };

  const getScenariosCount = (goalId) => {
    return allScenarios.filter(s => s.goal_id === goalId).length;
  };

  const calculateRiskLevel = (expectedReturn) => {
    const returnValue = parseFloat(expectedReturn) || 0;
    if (returnValue < 5) return "riskLow";
    if (returnValue < 10) return "riskMedium";
    return "riskHigh";
  };

  const getRiskText = (expectedReturn) => {
    const returnValue = parseFloat(expectedReturn) || 0;
    if (returnValue < 5) return "Низкий";
    if (returnValue < 10) return "Средний";
    return "Высокий";
  };

  const getStatusText = (status) => {
    switch (status) {
      case "active": return "Активна";
      case "completed": return "Выполнена";
      case "paused": return "Приостановлена";
      default: return "Неизвестно";
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="loadingContainer">
          <div className="loadingAnimation"></div>
          <p>Загружаем данные...</p>
        </div>
      </Layout>
    );
  }

  const filteredGoals = getFilteredGoals();
  const filteredScenarios = getFilteredScenarios();
  const hasScenarios = allScenarios.length > 0;

  return (
    <Layout>
      <div className="scenariosMainContainer">
        {/* Шапка */}
        <div className="scenariosHeader">
          <h1>Сценарии финансовых целей</h1>
          <p>
            Управляйте и анализируйте различные стратегии достижения ваших финансовых целей.
            Каждый сценарий представляет собой уникальный план накоплений.
          </p>
        </div>

        {/* Сообщение об ошибке */}
        {error && (
          <div className="errorMessage">
            <strong>Внимание:</strong> {error}
          </div>
        )}

        {/* Фильтры */}
        <div className="filtersSection">
          <h3 className="filtersTitle">
            <span>🔍</span>
            Фильтры и сортировка
          </h3>

          <div className="filterGrid">
            <div className="filterGroup">
              <label className="filterLabel">Статус цели</label>
              <select
                className="filterSelect"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="all">Все статусы</option>
                <option value="active">Только активные</option>
                <option value="completed">Только выполненные</option>
                <option value="paused">Только приостановленные</option>
              </select>
            </div>

            <div className="filterGroup">
              <label className="filterLabel">Сортировка</label>
              <select
                className="filterSelect"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="progress">По прогрессу</option>
                <option value="target_amount">По сумме цели</option>
                <option value="created_at">По дате создания</option>
                <option value="title">По названию</option>
              </select>
            </div>

            <div className="filterGroup">
              <label className="filterLabel">Поиск</label>
              <input
                type="text"
                className="filterSelect"
                placeholder="Поиск по названию..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="filterGroup filterActions">
              <button
                className="clearFiltersButton"
                onClick={handleClearFilters}
              >
                Сбросить фильтры
              </button>
            </div>
          </div>
        </div>

        {/* Секция с целями */}
        <div className="goalsSection">
          <h3 className="sectionTitle">
            <span>🎯</span>
            Ваши финансовые цели
            <span className="sectionSubtitle">({filteredGoals.length})</span>
          </h3>

          {filteredGoals.length === 0 ? (
            <div className="emptyState">
              <div className="emptyStateIcon">📋</div>
              <h3>Цели не найдены</h3>
              <p>
                {searchTerm || filterStatus !== "all"
                  ? "Попробуйте изменить параметры поиска или сбросить фильтры"
                  : "У вас еще нет финансовых целей. Создайте первую цель для начала планирования."}
              </p>
              {!searchTerm && filterStatus === "all" && (
                <button
                  onClick={handleCreateGoal}
                  className="emptyStateButton"
                >
                  <span>+</span>
                  Создать первую цель
                </button>
              )}
            </div>
          ) : (
            <div className="goalsGrid">
              {filteredGoals.map(goal => {
                const progress = Math.round((parseFloat(goal.current_amount) / parseFloat(goal.target_amount)) * 100);
                const scenariosCount = getScenariosCount(goal.goal_id);

                return (
                  <div
                    key={goal.goal_id}
                    className="goalCard"
                    onClick={() => handleGoalClick(goal.goal_id)}
                  >
                    <div className="goalCardHeader">
                      <h4 className="goalTitle">{goal.title}</h4>
                      <div className="goalMeta">
                        <span className={`goalStatus status${goal.status}`}>
                          {getStatusText(goal.status)}
                        </span>
                        <span className="scenariosCountBadge">
                          📊 {scenariosCount} сценариев
                        </span>
                      </div>
                    </div>

                    <div className="goalStats">
                      <div className="goalStatRow">
                        <span className="goalStatLabel">Целевая сумма:</span>
                        <span className="goalStatValue">{formatCurrency(goal.target_amount)} ₽</span>
                      </div>
                      <div className="goalStatRow">
                        <span className="goalStatLabel">Текущая сумма:</span>
                        <span className="goalStatValue">{formatCurrency(goal.current_amount)} ₽</span>
                      </div>

                      <div className="progressContainer">
                        <div className="progressLabel">
                          <span>Прогресс</span>
                          <span>{progress}%</span>
                        </div>
                        <div className="progressBar">
                          <div
                            className="progressFill"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="scenariosInfo">
                      <button
                        className="scenariosButton"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewScenarios(goal.goal_id, goal.title);
                        }}
                      >
                        <span>📈</span>
                        Управление сценариями
                        {scenariosCount > 0 && ` (${scenariosCount})`}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Секция со всеми сценариями - ВЫКАТНОЙ СПИСОК */}
        {hasScenarios && (
          <div className="allScenariosSection">
            {/* ИЗМЕНЕНО: теперь кликабельный заголовок открывает список */}
            <div 
              className="allScenariosHeader clickable" 
              onClick={toggleScenariosSection}
            >
              <h3 className="allScenariosTitle">
                <span>📋</span>
                Все сценарии
                <span className="allScenariosCount">{allScenarios.length}</span>
              </h3>
              <span className={`expandIcon ${isScenariosExpanded ? 'expanded' : ''}`}>
                {isScenariosExpanded ? '▼' : '▶'}
              </span>
            </div>

            {/* Контейнер с анимацией */}
            <div className={`scenariosCollapse ${isScenariosExpanded ? 'expanded' : ''}`}>
              {filteredScenarios.length === 0 ? (
                <div className="emptyState small">
                  <p>Нет сценариев, соответствующих фильтрам</p>
                </div>
              ) : (
                <div className="scenariosList">
                  {filteredScenarios.map((scenario, index) => {
                    const riskClass = calculateRiskLevel(scenario.expected_return);
                    const riskText = getRiskText(scenario.expected_return);

                    return (
                      <div
                        key={scenario.scenario_id || index}
                        className="scenarioItem"
                        onClick={() => handleViewScenarioDetails(scenario.scenario_id)}
                      >
                        <div className="scenarioHeader">
                          <div className="scenarioGoal">
                            <span>🎯</span>
                            {scenario.goal_title}
                          </div>
                          <h4 className="scenarioName">{scenario.name || `Сценарий ${index + 1}`}</h4>
                          <div className="scenarioMeta">
                            <span>📅 {new Date(scenario.created_at).toLocaleDateString('ru-RU')}</span>
                            <span className={`scenarioRisk ${riskClass}`}>
                              {riskText} риск
                            </span>
                          </div>
                        </div>

                        <div className="scenarioContent">
                          <div className="scenarioRow">
                            <span className="scenarioLabel">Ежемесячный взнос:</span>
                            <span className="scenarioValue">{formatCurrency(scenario.monthly_contribution)} ₽</span>
                          </div>
                          <div className="scenarioRow">
                            <span className="scenarioLabel">Ожидаемая доходность:</span>
                            <span className="scenarioValue">{scenario.expected_return}%</span>
                          </div>
                          <div className="scenarioRow">
                            <span className="scenarioLabel">Инфляция:</span>
                            <span className="scenarioValue">{scenario.inflation_rate}%</span>
                          </div>
                        </div>

                        <div className="scenarioActions">
                          <button
                            className="scenarioActionButton"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleViewScenarioDetails(scenario.scenario_id);
                            }}
                          >
                            👁️ Просмотр
                          </button>
                          <button
                            className="scenarioActionButton"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/scenarios/${scenario.goal_id}`);
                            }}
                          >
                            📊 Анализ
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Кнопка обновления */}
        <div className="refreshSection">
          <button
            onClick={loadData}
            className="refreshButton"
          >
            ⟳ Обновить данные
          </button>
        </div>
      </div>
    </Layout>
  );
}

export default ScenariosMainPage;