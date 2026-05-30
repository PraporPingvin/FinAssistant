import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Activity,
  AlertCircle,
  ArrowLeft,
  BarChart3,
  Calendar,
  Clock,
  DollarSign,
  Edit2,
  Save,
  Shield,
  Target,
  Trash2,
  TrendingUp,
  X,
  Zap,
} from "lucide-react";
import Layout from "../../../components/Layout";
import ModernDialog from "../../../components/ModernDialog/ModernDialog";
import { getScenario, updateScenario, deleteScenario, getGoal, getForecast } from "../../../api/api";
import "./ScenarioDetailPage.css";

function ScenarioDetailPage() {
  const { scenarioId } = useParams();
  const navigate = useNavigate();

  const [scenario, setScenario] = useState(null);
  const [goal, setGoal] = useState(null);
  const [forecast, setForecast] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState({});
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (scenarioId) loadData();
  }, [scenarioId]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError("");
      const scenarioData = await getScenario(scenarioId);
      setScenario(scenarioData);
      setEditData(scenarioData);

      const goalData = await getGoal(scenarioData.goal_id);
      setGoal(goalData);

      try {
        const forecastData = await getForecast(scenarioData.goal_id);
        setForecast(forecastData);
      } catch (forecastError) {
        console.log("Прогноз не найден:", forecastError);
      }
    } catch (error) {
      console.error("Ошибка загрузки сценария:", error);
      setError(`Не удалось загрузить данные: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    if (["monthly_contribution", "expected_return", "inflation_rate", "target_amount"].includes(name)) {
      setEditData((prev) => ({ ...prev, [name]: value.replace(/[^\d.]/g, "") }));
    } else {
      setEditData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const updates = {
        name: editData.name?.trim(),
        monthly_contribution: parseFloat(editData.monthly_contribution),
        expected_return: parseFloat(editData.expected_return),
        inflation_rate: parseFloat(editData.inflation_rate),
        target_amount: parseFloat(editData.target_amount),
      };
      Object.keys(updates).forEach((key) => updates[key] === undefined && delete updates[key]);
      await updateScenario(scenarioId, updates);
      setScenario({ ...scenario, ...updates });
      setEditMode(false);
    } catch (error) {
      console.error("Ошибка сохранения:", error);
      setError(`Ошибка сохранения: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      setDeleting(true);
      await deleteScenario(scenarioId);
      navigate(`/scenarios/${scenario?.goal_id}`);
    } catch (error) {
      console.error("Ошибка удаления:", error);
      setError(`Ошибка удаления: ${error.message}`);
    } finally {
      setDeleting(false);
    }
  };

  const formatCurrency = (amount) => new Intl.NumberFormat("ru-RU").format(parseFloat(amount) || 0);

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    try {
      return new Date(dateString).toLocaleDateString("ru-RU", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });
    } catch {
      return "-";
    }
  };

  const calculateMonthsToGoal = () => {
    if (!goal || !scenario) return 0;
    const target = parseFloat(scenario.target_amount || goal.target_amount) || 0;
    const current = parseFloat(goal.current_amount) || 0;
    const monthly = parseFloat(scenario.monthly_contribution) || 0;
    if (monthly <= 0) return Infinity;
    return Math.max(0, Math.ceil((target - current) / monthly));
  };

  const calculateRiskLevel = (expectedReturn) => {
    const value = parseFloat(expectedReturn) || 0;
    if (value < 5) return { level: "Низкий", className: "low", icon: <Shield size={14} /> };
    if (value < 10) return { level: "Средний", className: "medium", icon: <Activity size={14} /> };
    return { level: "Высокий", className: "high", icon: <Zap size={14} /> };
  };

  if (loading) {
    return (
      <Layout>
        <div className="scenarioDetailLoading"><div className="scenarioDetailSpinner" /><p>Загружаем сценарий...</p></div>
      </Layout>
    );
  }

  if (error || !scenario) {
    return (
      <Layout>
        <div className="scenarioDetailPage"><div className="scenarioDetailError"><AlertCircle size={48} /><h2>Не удалось открыть сценарий</h2><p>{error || "Сценарий не найден"}</p><button onClick={() => navigate("/scenarios")}>Вернуться к сценариям</button></div></div>
      </Layout>
    );
  }

  const monthsToGoal = calculateMonthsToGoal();
  const risk = calculateRiskLevel(scenario.expected_return);
  const effectiveReturn = ((parseFloat(scenario.expected_return) || 0) - (parseFloat(scenario.inflation_rate) || 0)).toFixed(1);
  const goalProgress = goal?.target_amount > 0 ? Math.min(100, Math.round(((parseFloat(goal.current_amount) || 0) / parseFloat(goal.target_amount)) * 100)) : 0;

  return (
    <Layout>
      <div className="scenarioDetailPage">
        <button onClick={() => navigate(-1)} className="detailBackButton"><ArrowLeft size={16} /> Назад</button>

        <section className="scenarioDetailHero">
          <div>
            <span className="detailEyebrow">Scenario profile</span>
            {editMode ? (
              <input type="text" name="name" value={editData.name || ""} onChange={handleEditChange} className="detailTitleInput" placeholder="Название сценария" />
            ) : (
              <h1>{scenario.name}</h1>
            )}
            <p>Создан: {formatDate(scenario.created_at)}. Детальная карта параметров, риска и связи с финансовой целью.</p>
            <div className="detailHeroActions">
              {!editMode ? (
                <>
                  <button onClick={() => setEditMode(true)} className="detailPrimaryButton" disabled={deleting}><Edit2 size={17} /> Редактировать</button>
                  <button onClick={() => navigate(`/forecast/${scenario.goal_id}?scenario=${scenarioId}`)} className="detailGhostButton"><BarChart3 size={17} /> Прогноз</button>
                  <button onClick={() => setShowDeleteConfirm(true)} className="detailDangerButton" disabled={deleting}><Trash2 size={17} /> {deleting ? "Удаление..." : "Удалить"}</button>
                </>
              ) : (
                <>
                  <button onClick={() => { setEditData(scenario); setEditMode(false); }} className="detailGhostButton" disabled={saving}><X size={17} /> Отмена</button>
                  <button onClick={handleSave} className="detailPrimaryButton" disabled={saving}><Save size={17} /> {saving ? "Сохраняем..." : "Сохранить"}</button>
                </>
              )}
            </div>
          </div>
          <div className="detailHeroPanel">
            <span>Срок до цели</span><strong>{Number.isFinite(monthsToGoal) ? monthsToGoal : "-"}</strong><small>{Number.isFinite(monthsToGoal) ? "месяцев" : "недостижимо"}</small>
          </div>
        </section>

        <section className="detailStatsGrid">
          <article className="detailStatCard accent"><DollarSign size={24} /><span>Ежемесячный взнос</span><strong>{formatCurrency(scenario.monthly_contribution)} ₽</strong></article>
          <article className="detailStatCard"><TrendingUp size={24} /><span>Доходность</span><strong>{scenario.expected_return}%</strong></article>
          <article className="detailStatCard"><Activity size={24} /><span>Инфляция</span><strong>{scenario.inflation_rate}%</strong></article>
          <article className="detailStatCard"><Shield size={24} /><span>Риск</span><strong className={`riskBadge ${risk.className}`}>{risk.icon}{risk.level}</strong></article>
        </section>

        <section className="detailWorkspace">
          <main className="detailCard">
            <div className="detailCardHeader"><span>Параметры</span><h2>Настройки сценария</h2></div>
            <div className="detailFormGrid">
              <EditableMetric label="Ежемесячный взнос" icon={<DollarSign size={15} />} editMode={editMode} name="monthly_contribution" value={editData.monthly_contribution} onChange={handleEditChange} display={`${formatCurrency(scenario.monthly_contribution)} ₽`} />
              <EditableMetric label="Ожидаемая доходность" icon={<TrendingUp size={15} />} editMode={editMode} name="expected_return" value={editData.expected_return} onChange={handleEditChange} display={`${scenario.expected_return}%`} />
              <EditableMetric label="Ожидаемая инфляция" icon={<Activity size={15} />} editMode={editMode} name="inflation_rate" value={editData.inflation_rate} onChange={handleEditChange} display={`${scenario.inflation_rate}%`} />
              <EditableMetric label="Целевая сумма" icon={<Target size={15} />} editMode={editMode} name="target_amount" value={editData.target_amount} onChange={handleEditChange} display={`${formatCurrency(scenario.target_amount || goal?.target_amount)} ₽`} />
            </div>
          </main>

          <aside className="detailCard side">
            <div className="detailCardHeader"><span>Расчёт</span><h2>Показатели</h2></div>
            <div className="calculationList">
              <div><span><Clock size={15} /> Срок</span><strong>{Number.isFinite(monthsToGoal) ? `${monthsToGoal} мес.` : "Недостижимо"}</strong></div>
              <div><span><TrendingUp size={15} /> Эффективная доходность</span><strong>{effectiveReturn}%</strong></div>
              <div><span><DollarSign size={15} /> Темп в день</span><strong>{formatCurrency(Math.ceil((parseFloat(scenario.monthly_contribution) || 0) / 30))} ₽</strong></div>
            </div>
          </aside>
        </section>

        {goal && (
          <section className="linkedGoalCard">
            <div className="detailCardHeader"><span>Связанная цель</span><h2>{goal.title}</h2></div>
            <div className="linkedGoalGrid">
              <div><span>Цель</span><strong>{formatCurrency(goal.target_amount)} ₽</strong></div>
              <div><span>Накоплено</span><strong>{formatCurrency(goal.current_amount)} ₽</strong></div>
              <div><span>Прогресс</span><strong>{goalProgress}%</strong></div>
            </div>
            <div className="detailProgressTrack"><div style={{ width: `${goalProgress}%` }} /></div>
            <div className="detailBottomActions">
              <button onClick={() => navigate(`/goals/${goal.goal_id}`)} className="detailGhostLight">Перейти к цели</button>
              <button onClick={() => navigate(`/scenarios/compare/${scenario.goal_id}`)} className="detailPrimaryButton"><BarChart3 size={16} /> Сравнить сценарии</button>
            </div>
          </section>
        )}
        <ModernDialog
          open={showDeleteConfirm}
          variant="danger"
          eyebrow="Сценарий"
          title="Удалить сценарий?"
          description={`Сценарий "${scenario?.name || "Без названия"}" будет удален без возможности отмены.`}
          cancelText="Отмена"
          confirmText="Удалить"
          loading={deleting}
          onCancel={() => setShowDeleteConfirm(false)}
          onConfirm={handleDelete}
        />
      </div>
    </Layout>
  );
}

function EditableMetric({ label, icon, editMode, name, value, onChange, display }) {
  return (
    <div className="editableMetric">
      <span>{icon} {label}</span>
      {editMode ? <input name={name} value={value || ""} onChange={onChange} /> : <strong>{display}</strong>}
    </div>
  );
}

export default ScenarioDetailPage;
