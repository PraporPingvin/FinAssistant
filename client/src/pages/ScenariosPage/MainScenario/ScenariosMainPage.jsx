import React, { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  Home,
  Target,
  BarChart3,
  Plus,
  RefreshCw,
  Search,
  Filter,
  ChevronDown,
  ChevronRight,
  Calendar,
  DollarSign,
  TrendingUp,
  Activity,
  Shield,
  Zap,
  Eye,
  ArrowRight,
  AlertCircle,
} from "lucide-react";
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
  const [isScenariosExpanded, setIsScenariosExpanded] = useState(false);

  const { user } = useAuth();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError("");

      const goalsData = await getGoals();
      setGoals(goalsData);

      const scenariosPromises = goalsData.map(goal =>
        getScenarios(goal.goal_id).catch(() => [])
      );

      const scenariosResults = await Promise.all(scenariosPromises);

      const allScenariosWithGoal = [];
      goalsData.forEach((goal, index) => {
        const goalScenarios = scenariosResults[index] || [];
        goalScenarios.forEach(scenario => {
          allScenariosWithGoal.push({
            ...scenario,
            goal_id: goal.goal_id,
            goal_title: goal.title,
            goal_target: goal.target_amount,
            goal_current: goal.current_amount,
            goal_progress: goal.target_amount > 0 
              ? Math.round((parseFloat(goal.current_amount) / parseFloat(goal.target_amount)) * 100) 
              : 0
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

  const getFilteredGoals = () => {
    let filtered = [...goals];

    if (filterStatus !== "all") {
      filtered = filtered.filter(goal => goal.status === filterStatus);
    }

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(goal =>
        goal.title.toLowerCase().includes(term) ||
        goal.description?.toLowerCase().includes(term)
      );
    }

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

  const handleViewScenarios = (goalId) => {
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
    if (returnValue < 5) return { class: "riskLow", text: "Низкий", icon: <Shield size={12} /> };
    if (returnValue < 10) return { class: "riskMedium", text: "Средний", icon: <Activity size={12} /> };
    return { class: "riskHigh", text: "Высокий", icon: <Zap size={12} /> };
  };

  const getStatusText = (status) => {
    switch (status) {
      case "active": return "Активна";
      case "completed": return "Выполнена";
      case "paused": return "Приостановлена";
      default: return "Неизвестно";
    }
  };

  const getStatusClass = (status) => {
    switch (status) {
      case "active": return "statusActive";
      case "completed": return "statusCompleted";
      case "paused": return "statusPaused";
      default: return "";
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="loadingContainer">
          <div className="loadingSpinner" />
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
      <div className="scenariosMainPage">
        <div className="breadcrumb">
          <Link to="/"><Home size={14} /> Главная</Link>
          <span>/</span>
          <span className="current">Сценарии</span>
        </div>

        <div className="pageHeaderScenarioMain">
          <div className="headerContent">
            <h1>Сценарии финансовых целей</h1>
            <p>
              Управляйте и анализируйте различные стратегии достижения ваших финансовых целей.
              Каждый сценарий представляет собой уникальный план накоплений.
            </p>
          </div>
        </div>

        {error && (
          <div className="errorMessage">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        <div className="filtersSection">
          <h3 className="filtersTitle">
            <Filter size={16} />
            Фильтры и сортировка
          </h3>

          <div className="filterGrid">
            <div className="filterGroup">
              <label className="filterLabel">Статус цели</label>
              <select className="filterSelect" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                <option value="all">Все статусы</option>
                <option value="active">Только активные</option>
                <option value="completed">Только выполненные</option>
                <option value="paused">Только приостановленные</option>
              </select>
            </div>

            <div className="filterGroup">
              <label className="filterLabel">Сортировка</label>
              <select className="filterSelect" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                <option value="progress">По прогрессу</option>
                <option value="target_amount">По сумме цели</option>
                <option value="created_at">По дате создания</option>
                <option value="title">По названию</option>
              </select>
            </div>

            <div className="filterGroup">
              <label className="filterLabel">
                <Search size={12} />
                Поиск
              </label>
              <input
                type="text"
                className="filterInput"
                placeholder="Поиск по названию..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="filterGroup filterActions">
              <button className="clearFiltersButton" onClick={handleClearFilters}>
                Сбросить фильтры
              </button>
            </div>
          </div>
        </div>

        <div className="goalsSection">
          <h3 className="sectionTitle">
            <Target size={18} />
            Ваши финансовые цели
            <span className="sectionSubtitle">({filteredGoals.length})</span>
          </h3>

          {filteredGoals.length === 0 ? (
            <div className="emptyState">
              <Target size={48} />
              <h3>Цели не найдены</h3>
              <p>
                {searchTerm || filterStatus !== "all"
                  ? "Попробуйте изменить параметры поиска или сбросить фильтры"
                  : "У вас еще нет финансовых целей. Создайте первую цель для начала планирования."}
              </p>
              {!searchTerm && filterStatus === "all" && (
                <button onClick={handleCreateGoal} className="emptyStateButton">
                  <Plus size={14} />
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
                  <div key={goal.goal_id} className="goalCard">
                    <div className="goalCardHeaderScenario">
                      <h4 className="goalTitle">{goal.title}</h4>
                      <div className="goalMeta">
                        <span className={`goalStatus ${getStatusClass(goal.status)}`}>
                          {getStatusText(goal.status)}
                        </span>
                        <span className="scenariosCountBadge">
                          <BarChart3 size={12} />
                          {scenariosCount} сценариев
                        </span>
                      </div>
                    </div>

                    <div className="goalStats">
                      <div className="goalStatRow">
                        <span className="goalStatLabel">Целевая сумма</span>
                        <span className="goalStatValue">{formatCurrency(goal.target_amount)} ₽</span>
                      </div>
                      <div className="goalStatRow">
                        <span className="goalStatLabel">Текущая сумма</span>
                        <span className="goalStatValue">{formatCurrency(goal.current_amount)} ₽</span>
                      </div>

                      <div className="progressContainer">
                        <div className="progressLabel">
                          <span>Прогресс</span>
                          <span>{progress}%</span>
                        </div>
                        <div className="progressBar">
                          <div className="progressFill" style={{ width: `${progress}%` }} />
                        </div>
                      </div>
                    </div>

                    <div className="scenariosInfo">
                      <button className="scenariosButton" onClick={() => handleViewScenarios(goal.goal_id)}>
                        <BarChart3 size={16} />
                        Управление сценариями
                        {scenariosCount > 0 && ` (${scenariosCount})`}
                        <ArrowRight size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {hasScenarios && (
          <div className="allScenariosSection">
            <div className="allScenariosHeader" onClick={toggleScenariosSection}>
              <h3 className="allScenariosTitle">
                <BarChart3 size={18} />
                Все сценарии
                <span className="allScenariosCount">{allScenarios.length}</span>
              </h3>
              <span className="expandIcon">
                {isScenariosExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
              </span>
            </div>

            <div className={`scenariosCollapse ${isScenariosExpanded ? "expanded" : ""}`}>
              {filteredScenarios.length === 0 ? (
                <div className="emptyState small">
                  <p>Нет сценариев, соответствующих фильтрам</p>
                </div>
              ) : (
                <div className="scenariosListMain">
                  {filteredScenarios.map((scenario) => {
                    const risk = calculateRiskLevel(scenario.expected_return);
                    
                    return (
                      <div key={scenario.scenario_id} className="scenarioItem" onClick={() => handleViewScenarioDetails(scenario.scenario_id)}>
                        <div className="scenarioHeader">
                          <div className="scenarioGoal">
                            <Target size={12} />
                            {scenario.goal_title}
                          </div>
                          <h4 className="scenarioName">{scenario.name || "Без названия"}</h4>
                          <div className="scenarioMeta">
                            <span className="scenarioDate">
                              <Calendar size={12} />
                              {new Date(scenario.created_at).toLocaleDateString('ru-RU')}
                            </span>
                            <span className={`scenarioRisk ${risk.class}`}>
                              {risk.icon} {risk.text} риск
                            </span>
                          </div>
                        </div>

                        <div className="scenarioContent">
                          <div className="scenarioRow">
                            <span className="scenarioLabel">
                              <DollarSign size={12} />
                              Ежемесячный взнос
                            </span>
                            <span className="scenarioValue">{formatCurrency(scenario.monthly_contribution)} ₽</span>
                          </div>
                          <div className="scenarioRow">
                            <span className="scenarioLabel">
                              <TrendingUp size={12} />
                              Ожидаемая доходность
                            </span>
                            <span className="scenarioValue">{scenario.expected_return}%</span>
                          </div>
                          <div className="scenarioRow">
                            <span className="scenarioLabel">
                              <Activity size={12} />
                              Инфляция
                            </span>
                            <span className="scenarioValue">{scenario.inflation_rate}%</span>
                          </div>
                        </div>

                        <div className="scenarioActions">
                          <button className="scenarioActionButton" onClick={(e) => { e.stopPropagation(); handleViewScenarioDetails(scenario.scenario_id); }}>
                            <Eye size={14} />
                            Просмотр
                          </button>
                          <button className="scenarioActionButton" onClick={(e) => { e.stopPropagation(); handleViewScenarios(scenario.goal_id); }}>
                            <BarChart3 size={14} />
                            Анализ
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

        <div className="refreshSection">
          <button onClick={loadData} className="refreshButton">
            <RefreshCw size={14} />
            Обновить данные
          </button>
        </div>
      </div>
    </Layout>
  );
}

export default ScenariosMainPage;