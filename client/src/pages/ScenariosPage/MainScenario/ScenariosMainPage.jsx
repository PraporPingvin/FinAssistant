import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  Activity,
  AlertCircle,
  ArrowRight,
  BarChart3,
  Calendar,
  DollarSign,
  Eye,
  Filter,
  Home,
  Plus,
  RefreshCw,
  Search,
  Shield,
  Target,
  TrendingUp,
  Zap,
} from "lucide-react";
import Layout from "../../../components/Layout";
import { getGoals, getScenarios } from "../../../api/api";
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

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError("");
      const goalsData = await getGoals();
      setGoals(goalsData || []);

      const scenarioGroups = await Promise.all(
        (goalsData || []).map((goal) => getScenarios(goal.goal_id).catch(() => []))
      );

      const scenarios = [];
      (goalsData || []).forEach((goal, index) => {
        (scenarioGroups[index] || []).forEach((scenario) => {
          scenarios.push({
            ...scenario,
            goal_id: goal.goal_id,
            goal_title: goal.title,
            goal_target: goal.target_amount,
            goal_current: goal.current_amount,
            goal_progress: goal.target_amount > 0
              ? Math.round(((parseFloat(goal.current_amount) || 0) / parseFloat(goal.target_amount)) * 100)
              : 0,
          });
        });
      });

      setAllScenarios(scenarios);
    } catch (error) {
      console.error("Ошибка загрузки сценариев:", error);
      setError(`Не удалось загрузить данные: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => new Intl.NumberFormat("ru-RU").format(parseFloat(amount) || 0);

  const getProgress = (goal) => goal?.target_amount > 0
    ? Math.min(100, Math.round(((parseFloat(goal.current_amount) || 0) / parseFloat(goal.target_amount)) * 100))
    : 0;

  const getScenariosCount = (goalId) => allScenarios.filter((scenario) => scenario.goal_id === goalId).length;

  const getStatusText = (status) => {
    if (status === "completed") return "Выполнена";
    if (status === "paused") return "Пауза";
    return "Активна";
  };

  const calculateRiskLevel = (expectedReturn) => {
    const value = parseFloat(expectedReturn) || 0;
    if (value < 5) return { className: "low", text: "Низкий", icon: <Shield size={13} /> };
    if (value < 10) return { className: "medium", text: "Средний", icon: <Activity size={13} /> };
    return { className: "high", text: "Высокий", icon: <Zap size={13} /> };
  };

  const filteredGoals = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const items = goals.filter((goal) => {
      const matchesStatus = filterStatus === "all" || goal.status === filterStatus;
      const matchesSearch = !term || goal.title?.toLowerCase().includes(term) || goal.description?.toLowerCase().includes(term);
      return matchesStatus && matchesSearch;
    });

    items.sort((a, b) => {
      if (sortBy === "target_amount") return (parseFloat(b.target_amount) || 0) - (parseFloat(a.target_amount) || 0);
      if (sortBy === "created_at") return new Date(b.created_at || 0) - new Date(a.created_at || 0);
      if (sortBy === "title") return (a.title || "").localeCompare(b.title || "");
      return getProgress(b) - getProgress(a);
    });

    return items;
  }, [goals, filterStatus, searchTerm, sortBy]);

  const filteredScenarios = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return allScenarios;
    return allScenarios.filter((scenario) =>
      scenario.name?.toLowerCase().includes(term) || scenario.goal_title?.toLowerCase().includes(term)
    );
  }, [allScenarios, searchTerm]);

  const totals = {
    goals: goals.length,
    scenarios: allScenarios.length,
    activeGoals: goals.filter((goal) => goal.status !== "completed").length,
    avgProgress: goals.length ? Math.round(goals.reduce((sum, goal) => sum + getProgress(goal), 0) / goals.length) : 0,
  };

  if (loading) {
    return (
      <Layout>
        <div className="scenarioMainLoading"><div className="scenarioMainSpinner" /><p>Загружаем сценарии...</p></div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="scenariosMainPage">
        <nav className="scenarioMainBreadcrumb">
          <Link to="/"><Home size={14} /> Главная</Link><span>/</span><span>Сценарии</span>
        </nav>

        <section className="scenarioMainHero">
          <div>
            <span className="scenarioMainEyebrow">Strategy cockpit</span>
            <h1>Сценарии финансовых целей</h1>
            <p>Единое пространство для всех целей и стратегий: смотрите прогресс, находите сценарии и быстро переходите к анализу.</p>
            <div className="scenarioMainActions">
              <button onClick={() => navigate("/goals/new")} className="scenarioMainPrimary"><Plus size={18} /> Новая цель</button>
              <button onClick={loadData} className="scenarioMainGhost"><RefreshCw size={18} /> Обновить</button>
            </div>
          </div>
          <div className="scenarioMainHeroPanel">
            <span>Всего сценариев</span><strong>{totals.scenarios}</strong><small>{totals.goals} целей в системе</small>
          </div>
        </section>

        {error && <div className="scenarioMainError"><AlertCircle size={18} /> {error}</div>}

        <section className="scenarioMainStats">
          <article className="mainStatCard accent"><BarChart3 size={24} /><span>Сценариев</span><strong>{totals.scenarios}</strong></article>
          <article className="mainStatCard"><Target size={24} /><span>Целей</span><strong>{totals.goals}</strong></article>
          <article className="mainStatCard"><Activity size={24} /><span>Активных целей</span><strong>{totals.activeGoals}</strong></article>
          <article className="mainStatCard"><TrendingUp size={24} /><span>Средний прогресс</span><strong>{totals.avgProgress}%</strong></article>
        </section>

        <section className="scenarioMainFilters">
          <div className="filterTitle"><Filter size={16} /><span>Фильтры и поиск</span></div>
          <div className="filterGridModern">
            <label><span>Статус цели</span><select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}><option value="all">Все статусы</option><option value="active">Активные</option><option value="completed">Выполненные</option><option value="paused">На паузе</option></select></label>
            <label><span>Сортировка</span><select value={sortBy} onChange={(e) => setSortBy(e.target.value)}><option value="progress">По прогрессу</option><option value="target_amount">По сумме цели</option><option value="created_at">По дате создания</option><option value="title">По названию</option></select></label>
            <label><span><Search size={13} /> Поиск</span><input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Название цели или сценария" /></label>
            <button onClick={() => { setFilterStatus("all"); setSortBy("progress"); setSearchTerm(""); }} className="resetFiltersButton">Сбросить</button>
          </div>
        </section>

        <section className="mainSectionHeader">
          <div><span>Цели</span><h2>Финансовые цели</h2></div>
          <strong>{filteredGoals.length}</strong>
        </section>

        {filteredGoals.length ? (
          <section className="goalsGridModern">
            {filteredGoals.map((goal) => {
              const progress = getProgress(goal);
              const scenariosCount = getScenariosCount(goal.goal_id);
              return (
                <article key={goal.goal_id} className="goalScenarioCard">
                  <div className="goalScenarioTop">
                    <span className={`statusPill ${goal.status || "active"}`}>{getStatusText(goal.status)}</span>
                    <span className="scenarioCountPill"><BarChart3 size={13} /> {scenariosCount}</span>
                  </div>
                  <h3>{goal.title}</h3>
                  <div className="goalMoneyGrid">
                    <div><span>Цель</span><strong>{formatCurrency(goal.target_amount)} ₽</strong></div>
                    <div><span>Накоплено</span><strong>{formatCurrency(goal.current_amount)} ₽</strong></div>
                  </div>
                  <div className="mainProgressTrack"><div style={{ width: `${progress}%` }} /></div>
                  <div className="progressLine"><span>Прогресс</span><strong>{progress}%</strong></div>
                  <button onClick={() => navigate(`/scenarios/${goal.goal_id}`)} className="openScenarioButton"><BarChart3 size={16} /> Управление сценариями <ArrowRight size={15} /></button>
                </article>
              );
            })}
          </section>
        ) : (
          <section className="scenarioMainEmpty"><Target size={52} /><h2>Цели не найдены</h2><p>Измените фильтры или создайте новую финансовую цель.</p><button onClick={() => navigate("/goals/new")} className="scenarioMainPrimary"><Plus size={18} /> Создать цель</button></section>
        )}

        {!!allScenarios.length && (
          <>
            <section className="mainSectionHeader scenariosHeader">
              <div><span>Сценарии</span><h2>Все стратегии</h2></div>
              <strong>{filteredScenarios.length}</strong>
            </section>
            <section className="allScenariosGridModern">
              {filteredScenarios.map((scenario) => {
                const risk = calculateRiskLevel(scenario.expected_return);
                return (
                  <article key={scenario.scenario_id} className="scenarioPreviewCard" onClick={() => navigate(`/scenarios/detail/${scenario.scenario_id}`)}>
                    <span className="scenarioGoalName"><Target size={13} /> {scenario.goal_title}</span>
                    <h3>{scenario.name || "Без названия"}</h3>
                    <div className="previewMetrics">
                      <div><DollarSign size={14} /><span>{formatCurrency(scenario.monthly_contribution)} ₽/мес</span></div>
                      <div><TrendingUp size={14} /><span>{scenario.expected_return}%</span></div>
                      <div><Activity size={14} /><span>{scenario.inflation_rate}% инфл.</span></div>
                    </div>
                    <div className="scenarioPreviewFooter">
                      <span className={`riskPill ${risk.className}`}>{risk.icon}{risk.text} риск</span>
                      <button onClick={(e) => { e.stopPropagation(); navigate(`/scenarios/detail/${scenario.scenario_id}`); }}><Eye size={14} /> Открыть</button>
                    </div>
                  </article>
                );
              })}
            </section>
          </>
        )}
      </div>
    </Layout>
  );
}

export default ScenariosMainPage;
