import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  Activity,
  AlertCircle,
  ArrowLeft,
  BarChart3,
  Calendar,
  ChevronRight,
  Clock,
  DollarSign,
  Edit2,
  Eye,
  Home,
  Plus,
  RefreshCw,
  Shield,
  Target,
  Trash2,
  TrendingUp,
  Zap,
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
  const [sortBy, setSortBy] = useState("created_at");

  useEffect(() => {
    if (goalId) loadData();
    else {
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
      const scenariosData = await getScenarios(goalId).catch(() => []);
      setScenarios(scenariosData || []);
    } catch (error) {
      console.error("Ошибка загрузки сценариев:", error);
      setError(`Не удалось загрузить сценарии: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => new Intl.NumberFormat("ru-RU").format(parseFloat(amount) || 0);

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    try {
      return new Date(dateString).toLocaleDateString("ru-RU", { day: "2-digit", month: "short", year: "numeric" });
    } catch {
      return "-";
    }
  };

  const calculateMonthsToGoal = (scenario) => {
    if (!goal || !scenario) return 0;
    const target = parseFloat(goal.target_amount) || 0;
    const current = parseFloat(goal.current_amount) || 0;
    const monthly = parseFloat(scenario.monthly_contribution) || 0;
    if (monthly <= 0) return Infinity;
    return Math.max(0, Math.ceil((target - current) / monthly));
  };

  const calculateRiskLevel = (expectedReturn) => {
    const value = parseFloat(expectedReturn) || 0;
    if (value < 5) return { level: "Низкий", className: "low", icon: <Shield size={13} /> };
    if (value < 10) return { level: "Средний", className: "medium", icon: <Activity size={13} /> };
    return { level: "Высокий", className: "high", icon: <Zap size={13} /> };
  };

  const progress = goal?.target_amount > 0
    ? Math.min(100, Math.round(((parseFloat(goal.current_amount) || 0) / parseFloat(goal.target_amount)) * 100))
    : 0;

  const filteredScenarios = useMemo(() => {
    const items = [...scenarios];
    items.sort((a, b) => {
      if (sortBy === "name") return (a.name || "").localeCompare(b.name || "");
      if (sortBy === "expected_return") return (parseFloat(b.expected_return) || 0) - (parseFloat(a.expected_return) || 0);
      if (sortBy === "monthly_contribution") return (parseFloat(b.monthly_contribution) || 0) - (parseFloat(a.monthly_contribution) || 0);
      return new Date(b.created_at || 0) - new Date(a.created_at || 0);
    });
    return items;
  }, [scenarios, sortBy]);

  const stats = useMemo(() => {
    if (!scenarios.length) return { avgMonthly: 0, avgReturn: 0, minMonths: 0, maxMonths: 0 };
    const monthly = scenarios.map((s) => parseFloat(s.monthly_contribution) || 0);
    const returns = scenarios.map((s) => parseFloat(s.expected_return) || 0);
    const months = scenarios.map(calculateMonthsToGoal).filter(Number.isFinite);
    return {
      avgMonthly: Math.round(monthly.reduce((a, b) => a + b, 0) / scenarios.length),
      avgReturn: (returns.reduce((a, b) => a + b, 0) / scenarios.length).toFixed(1),
      minMonths: months.length ? Math.min(...months) : 0,
      maxMonths: months.length ? Math.max(...months) : 0,
    };
  }, [scenarios, goal]);

  const handleDeleteScenario = async (scenarioId, scenarioName, e) => {
    e.stopPropagation();
    if (!window.confirm(`Удалить сценарий "${scenarioName}"?`)) return;
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

  if (loading) {
    return (
      <Layout>
        <div className="scenarioLoading"><div className="scenarioSpinner" /><p>Загружаем сценарии...</p></div>
      </Layout>
    );
  }

  if (error || !goal) {
    return (
      <Layout>
        <div className="scenariosPage"><div className="scenarioErrorCard"><AlertCircle size={48} /><h2>Не удалось открыть сценарии</h2><p>{error || "Цель не найдена"}</p><Link to="/goals" className="scenarioBackLink">Вернуться к целям</Link></div></div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="scenariosPage">
        <nav className="scenarioBreadcrumb">
          <Link to="/"><Home size={14} /> Главная</Link><span>/</span>
          <Link to="/goals"><Target size={14} /> Цели</Link><span>/</span>
          <Link to={`/goals/${goalId}`}>{goal.title}</Link><span>/</span><span>Сценарии</span>
        </nav>

        <section className="scenarioHero">
          <div>
            <span className="scenarioEyebrow">Финансовые стратегии</span>
            <h1>Сценарии достижения цели</h1>
            <p>Сравнивайте взносы, доходность, риск и сроки, чтобы выбрать самый уверенный путь к цели: {goal.title}</p>
            <div className="scenarioHeroActions">
              <button onClick={() => navigate(`/scenarios/new/${goalId}`)} className="scenarioPrimaryButton"><Plus size={18} /> Новый сценарий</button>
              <button onClick={() => navigate(`/goals/${goalId}`)} className="scenarioGhostButton"><ArrowLeft size={18} /> К цели</button>
              {scenarios.length >= 2 && <button onClick={() => navigate(`/scenarios/compare/${goalId}`)} className="scenarioGhostButton"><BarChart3 size={18} /> Сравнить</button>}
            </div>
          </div>
          <div className="scenarioHeroPanel">
            <span>Прогресс цели</span><strong>{progress}%</strong>
            <div className="scenarioProgressTrack"><div style={{ width: `${progress}%` }} /></div>
            <small>{formatCurrency(goal.current_amount)} из {formatCurrency(goal.target_amount)} ₽</small>
          </div>
        </section>

        <section className="scenarioStatsGrid">
          <article className="scenarioStatCard accent"><BarChart3 size={24} /><span>Сценариев</span><strong>{scenarios.length}</strong></article>
          <article className="scenarioStatCard"><DollarSign size={24} /><span>Средний взнос</span><strong>{formatCurrency(stats.avgMonthly)} ₽</strong></article>
          <article className="scenarioStatCard"><TrendingUp size={24} /><span>Средняя доходность</span><strong>{stats.avgReturn}%</strong></article>
          <article className="scenarioStatCard"><Clock size={24} /><span>Диапазон сроков</span><strong>{stats.minMonths}-{stats.maxMonths} мес.</strong></article>
        </section>

        {scenarios.length > 0 && (
          <section className="scenarioToolbar">
            <div><span>Сортировка</span><select value={sortBy} onChange={(e) => setSortBy(e.target.value)}><option value="created_at">Сначала новые</option><option value="name">По названию</option><option value="expected_return">По доходности</option><option value="monthly_contribution">По взносу</option></select></div>
            <button onClick={loadData} className="scenarioRefreshButton"><RefreshCw size={15} /> Обновить</button>
          </section>
        )}

        {scenarios.length > 0 ? (
          <section className="scenariosGrid">
            {filteredScenarios.map((scenario, index) => {
              const months = calculateMonthsToGoal(scenario);
              const risk = calculateRiskLevel(scenario.expected_return);
              const effectiveReturn = ((parseFloat(scenario.expected_return) || 0) - (parseFloat(scenario.inflation_rate) || 0)).toFixed(1);
              return (
                <article key={scenario.scenario_id || index} className="scenarioCard" onClick={() => navigate(`/scenarios/detail/${scenario.scenario_id}`)}>
                  <div className="scenarioCardTop">
                    <div><span>Сценарий {index + 1}</span><h2>{scenario.name || `Сценарий ${index + 1}`}</h2><small><Calendar size={13} /> {formatDate(scenario.created_at)}</small></div>
                    <div className="scenarioActions">
                      <button onClick={(e) => { e.stopPropagation(); navigate(`/scenarios/edit/${scenario.scenario_id}`); }} title="Редактировать"><Edit2 size={15} /></button>
                      <button onClick={(e) => { e.stopPropagation(); navigate(`/scenarios/detail/${scenario.scenario_id}`); }} title="Открыть"><Eye size={15} /></button>
                      <button className="danger" onClick={(e) => handleDeleteScenario(scenario.scenario_id, scenario.name, e)} title="Удалить"><Trash2 size={15} /></button>
                    </div>
                  </div>

                  <div className="scenarioMetricList">
                    <div><span><DollarSign size={14} /> Ежемесячный взнос</span><strong>{formatCurrency(scenario.monthly_contribution)} ₽</strong></div>
                    <div><span><TrendingUp size={14} /> Ожидаемая доходность</span><strong>{scenario.expected_return || 0}%</strong></div>
                    <div><span><Activity size={14} /> Инфляция</span><strong>{scenario.inflation_rate || 0}%</strong></div>
                  </div>

                  <div className="scenarioResultStrip">
                    <div><span>Срок</span><strong>{Number.isFinite(months) ? `${months} мес.` : "Недостижимо"}</strong></div>
                    <div><span>Риск</span><strong className={`riskPill ${risk.className}`}>{risk.icon}{risk.level}</strong></div>
                    <div><span>Эффект</span><strong>{effectiveReturn}%</strong></div>
                  </div>

                  <button className="scenarioDetailsButton">Подробнее <ChevronRight size={15} /></button>
                </article>
              );
            })}
          </section>
        ) : (
          <section className="scenarioEmptyState">
            <BarChart3 size={54} /><h2>Сценариев пока нет</h2>
            <p>Создайте первый сценарий, чтобы сравнить разные стратегии достижения финансовой цели.</p>
            <button onClick={() => navigate(`/scenarios/new/${goalId}`)} className="scenarioPrimaryButton"><Plus size={18} /> Создать сценарий</button>
          </section>
        )}
      </div>
    </Layout>
  );
}

export default ScenariosPage;
