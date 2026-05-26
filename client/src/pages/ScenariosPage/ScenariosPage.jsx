import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  ArrowLeft,
  Home,
  Target,
  BarChart3,
  Plus,
  Trash2,
  Edit2,
  Eye,
  RefreshCw,
  TrendingUp,
  DollarSign,
  Activity,
  Shield,
  Zap,
  Clock,
  Calendar,
  AlertCircle,
  ChevronRight,
} from "lucide-react";
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

      const goalData = await getGoal(goalId);

      if (!goalData) {
        setError("Цель не найдена");
        return;
      }

      setGoal(goalData);

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

  const getFilteredScenarios = () => {
    let filtered = [...scenarios];

    if (filterStatus !== "all") {
      filtered = filtered.filter(scenario => scenario.status === filterStatus);
    }

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

  const handleEditScenario = (scenarioId, e) => {
    e.stopPropagation();
    navigate(`/scenarios/edit/${scenarioId}`);
  };

  const handleDeleteScenario = async (scenarioId, scenarioName, e) => {
    e.stopPropagation();
    if (!window.confirm(`Вы уверены, что хотите удалить сценарий "${scenarioName}"?`)) {
      return;
    }

    try {
      setLoading(true);
      await deleteScenario(scenarioId);
      await loadData();
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
    if (returnValue < 5) return { level: "Низкий", color: "#2E7D32", icon: <Shield size={12} />, description: "Минимальный риск" };
    if (returnValue < 10) return { level: "Средний", color: "#F5A623", icon: <Activity size={12} />, description: "Умеренный риск" };
    return { level: "Высокий", color: "#E35D5D", icon: <Zap size={12} />, description: "Высокий риск" };
  };

  const calculateStats = () => {
    if (scenarios.length === 0) {
      return { total: 0, avgMonthly: 0, avgReturn: 0, minMonths: 0, maxMonths: 0 };
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
          <div className="loadingSpinner" />
          <p>Загружаем сценарии...</p>
        </div>
      </Layout>
    );
  }

  if (error || !goal) {
    return (
      <Layout>
        <div className="scenariosPage">
          <div className="errorCard">
            <AlertCircle size={48} />
            <h2>Ошибка</h2>
            <p>{error || "Цель не найдена"}</p>
            <Link to="/goals" className="backButtonLink">← Вернуться к списку целей</Link>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="scenariosPage">
        <div className="breadcrumb">
          <Link to="/"><Home size={14} /> Главная</Link>
          <span>/</span>
          <Link to="/goals"><Target size={14} /> Цели</Link>
          <span>/</span>
          <Link to={`/goals/${goalId}`}>{goal.title}</Link>
          <span>/</span>
          <span className="current">Сценарии</span>
        </div>

        <div className="pageHeaderScenario">
          <div className="headerContent">
            <h1>Сценарии достижения цели</h1>
            <p>Создавайте и сравнивайте различные стратегии достижения вашей финансовой цели</p>
          </div>

          <div className="actionsContainer">
            <button onClick={() => navigate(`/goals/${goalId}`)} className="actionButton secondaryButton">
              <ArrowLeft size={14} />
              К цели
            </button>
            <button onClick={handleCreateScenario} className="actionButton primaryButton">
              <Plus size={14} />
              Новый сценарий
            </button>
            {scenarios.length >= 2 && (
              <button onClick={handleCompareScenarios} className="actionButton compareButton">
                <BarChart3 size={14} />
                Сравнить
              </button>
            )}
          </div>
        </div>

        <div className="goalInfoCard">
          <div className="goalInfoContent">
            <h3 className="goalInfoTitle">
              <Target size={18} />
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
                <div className="goalInfoLabel">Сценариев</div>
                <div className="goalInfoValue highlight">{scenarios.length}</div>
              </div>
            </div>
          </div>
          <div className="goalInfoStat">
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
        </div>

        {scenarios.length > 0 && (
          <div className="scenariosStats">
            <h3 className="statsTitle">
              <BarChart3 size={16} />
              Статистика сценариев
            </h3>
            <div className="statsGrid">
              <div className="statCard">
                <div className="statValue">{stats.total}</div>
                <div className="statLabel">Всего сценариев</div>
              </div>
              <div className="statCard">
                <div className="statValue">{formatCurrency(stats.avgMonthly)} ₽</div>
                <div className="statLabel">Средний взнос</div>
              </div>
              <div className="statCard">
                <div className="statValue">{stats.avgReturn}%</div>
                <div className="statLabel">Средняя доходность</div>
              </div>
              <div className="statCard">
                <div className="statValue">{stats.minMonths}-{stats.maxMonths} мес</div>
                <div className="statLabel">Диапазон сроков</div>
              </div>
            </div>
          </div>
        )}

        {scenarios.length > 0 && (
          <div className="filtersContainer">
            <div className="filterGroup">
              <span className="filterLabel">Сортировка:</span>
              <select className="filterSelect" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                <option value="created_at">По дате (новые)</option>
                <option value="name">По названию</option>
                <option value="expected_return">По доходности</option>
                <option value="monthly_contribution">По взносу</option>
              </select>
            </div>
            <div className="refreshButtonContainer">
              <button onClick={loadData} className="refreshButton" title="Обновить">
                <RefreshCw size={14} />
                Обновить
              </button>
            </div>
          </div>
        )}

        {scenarios.length > 0 ? (
          <div className="scenariosList">
            <div className="scenariosGrid">
              {filteredScenarios.map((scenario, index) => {
                const monthsToGoal = calculateMonthsToGoal(scenario);
                const risk = calculateRiskLevel(scenario.expected_return);
                const effectiveReturn = (parseFloat(scenario.expected_return || 0) - parseFloat(scenario.inflation_rate || 0)).toFixed(1);

                return (
                  <div key={scenario.scenario_id || index} className="scenarioCard" onClick={() => handleViewDetails(scenario)}>
                    <div className="scenarioCardHeader">
                      <div className="scenarioTitleSection">
                        <h4 className="scenarioCardTitle">{scenario.name || `Сценарий ${index + 1}`}</h4>
                        <div className="scenarioMeta">
                          <span className="scenarioDate">
                            <Calendar size={12} />
                            {formatDate(scenario.created_at)}
                          </span>
                        </div>
                      </div>
                      <div className="scenarioActions">
                        <button className="scenarioActionButton" onClick={(e) => handleEditScenario(scenario.scenario_id, e)} title="Редактировать">
                          <Edit2 size={14} />
                        </button>
                        <button className="scenarioActionButton" onClick={(e) => handleViewDetails(scenario)} title="Просмотреть">
                          <Eye size={14} />
                        </button>
                        <button className="scenarioActionButton deleteButton" onClick={(e) => handleDeleteScenario(scenario.scenario_id, scenario.name, e)} title="Удалить">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    <div className="scenarioContent">
                      <div className="scenarioMainInfo">
                        <div className="infoRow">
                          <span className="infoLabel">
                            <DollarSign size={12} />
                            Ежемесячный взнос
                          </span>
                          <span className="infoValue highlight">{formatCurrency(scenario.monthly_contribution)} ₽</span>
                        </div>
                        <div className="infoRow">
                          <span className="infoLabel">
                            <TrendingUp size={12} />
                            Ожидаемая доходность
                          </span>
                          <span className="infoValue">{scenario.expected_return}%</span>
                        </div>
                        <div className="infoRow">
                          <span className="infoLabel">
                            <Activity size={12} />
                            Инфляция
                          </span>
                          <span className="infoValue">{scenario.inflation_rate}%</span>
                        </div>
                      </div>

                      <div className="scenarioCalculations">
                        <div className="calculationRow">
                          <span className="calculationLabel">
                            <Clock size={12} />
                            Срок достижения
                          </span>
                          <span className="calculationValue">
                            {isFinite(monthsToGoal) && monthsToGoal > 0 ? (
                              <strong>{monthsToGoal} мес.</strong>
                            ) : <span className="warningText">Недостижимо</span>}
                          </span>
                        </div>
                        <div className="calculationRow">
                          <span className="calculationLabel">
                            {risk.icon}
                            Уровень риска
                          </span>
                          <span className="calculationValue">
                            <span className="riskBadge" style={{ backgroundColor: risk.color }}>
                              {risk.level}
                            </span>
                          </span>
                        </div>
                        <div className="calculationRow">
                          <span className="calculationLabel">Эффективная доходность</span>
                          <span className="calculationValue"><strong>{effectiveReturn}%</strong></span>
                        </div>
                      </div>
                    </div>

                    <div className="scenarioFooter">
                      <button className="detailsButton" onClick={() => navigate(`/scenarios/detail/${scenario.scenario_id}`)}>
                        Подробнее <ChevronRight size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="emptyState">
            <BarChart3 size={48} />
            <h3>Сценариев пока нет</h3>
            <p>Создайте первый сценарий для анализа различных стратегий достижения вашей финансовой цели.</p>
            <button onClick={handleCreateScenario} className="createFirstButton">
              <Plus size={14} />
              Создать первый сценарий
            </button>
            <div className="emptyStateTips">
              <h4>Советы по созданию сценариев:</h4>
              <ul>
                <li><span className="tipBadge conservative">Консервативный</span> Низкий риск (5-7%), стабильный доход</li>
                <li><span className="tipBadge moderate">Умеренный</span> Средний риск (7-10%), баланс доходности</li>
                <li><span className="tipBadge aggressive">Агрессивный</span> Высокий риск (10%+), максимальная доходность</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

export default ScenariosPage;