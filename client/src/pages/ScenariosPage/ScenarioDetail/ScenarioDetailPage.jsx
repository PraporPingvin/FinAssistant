import React, { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useRef } from "react";
import {
  Activity,
  AlertCircle,
  ArrowLeft,
  BarChart3,
  Calendar,
  Clock,
  DollarSign,
  Edit2,
  HelpCircle,
  RefreshCw,
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
import { getScenario, updateScenario, deleteScenario, getGoal, getForecast, getPayments, getRussiaInflation } from "../../../api/api";
import { calculateScenarioMetrics, formatPercent } from "../../../utils/scenarioCalculations";
import "./ScenarioDetailPage.css";

function ScenarioDetailPage() {
  const { scenarioId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editPanelRef = useRef(null);

  const [scenario, setScenario] = useState(null);
  const [goal, setGoal] = useState(null);
  const [payments, setPayments] = useState([]);
  const [forecast, setForecast] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState({});
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [inflationLoading, setInflationLoading] = useState(false);
  const [inflationInfo, setInflationInfo] = useState("");
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

      const [goalData, paymentsData] = await Promise.all([
        getGoal(scenarioData.goal_id),
        getPayments(scenarioData.goal_id).catch(() => []),
      ]);
      setGoal(goalData);
      setPayments(paymentsData || []);

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
      const updates = {};
      const name = editData.name?.trim();
      if (name) updates.name = name;

      ["monthly_contribution", "expected_return", "inflation_rate", "target_amount"].forEach((field) => {
        const value = parseFloat(editData[field]);
        if (Number.isFinite(value)) updates[field] = value;
      });

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

  const handleStartEdit = () => {
    setEditMode(true);
    window.setTimeout(() => {
      editPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      editPanelRef.current?.querySelector("input")?.focus();
    }, 80);
  };

  useEffect(() => {
    if (scenario && searchParams.get("edit") === "1" && !editMode) {
      handleStartEdit();
    }
  }, [scenario, searchParams, editMode]);

  const handleCancelEdit = () => {
    setEditData(scenario);
    setEditMode(false);
    setInflationInfo("");
  };

  const applyCurrentInflation = async () => {
    try {
      setInflationLoading(true);
      setInflationInfo("");
      const data = await getRussiaInflation();
      if (!Number.isFinite(Number(data.inflation_rate)) || Number(data.inflation_rate) > 25) {
        throw new Error("Некорректное значение инфляции");
      }
      setEditData((prev) => ({ ...prev, inflation_rate: String(data.inflation_rate) }));
      setInflationInfo(`Подставлено ${data.inflation_rate}%: ${data.source}. Сохраните сценарий, если хотите применить значение.`);
    } catch (error) {
      setInflationInfo("Не удалось загрузить инфляцию автоматически. Можно ввести процент вручную.");
    } finally {
      setInflationLoading(false);
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
    return calculateScenarioMetrics({ goal, scenario, payments }).monthsToGoal;
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
  const metrics = calculateScenarioMetrics({ goal, scenario, payments });
  const effectiveReturn = metrics.effectiveReturn.toFixed(1);
  const goalProgress = goal?.target_amount > 0 ? Math.min(100, Math.round((metrics.current / parseFloat(goal.target_amount)) * 100)) : 0;

  return (
    <Layout>
      <div className="scenarioDetailPage">
        <button onClick={() => navigate(-1)} className="detailBackButton"><ArrowLeft size={16} /> Назад</button>

        <section className="scenarioDetailHero">
          <div>
          <span className="detailEyebrow">Параметры сценария</span>
            {editMode ? (
              <input type="text" name="name" value={editData.name || ""} onChange={handleEditChange} className="detailTitleInput" placeholder="Название сценария" />
            ) : (
              <h1>{scenario.name}</h1>
            )}
            <p>Эта страница показывает, как взнос, дополнительный рост и инфляция меняют срок достижения цели. Создан: {formatDate(scenario.created_at)}.</p>
            <div className="detailHeroActions">
              <button onClick={() => navigate(`/forecast/${scenario.goal_id}?scenario=${scenarioId}`)} className="detailGhostButton"><BarChart3 size={17} /> Прогноз</button>
              <button onClick={() => setShowDeleteConfirm(true)} className="detailDangerButton" disabled={deleting}><Trash2 size={17} /> {deleting ? "Удаление..." : "Удалить"}</button>
            </div>
          </div>
          <div className="detailHeroPanel">
            <span>Срок до цели</span><strong>{Number.isFinite(monthsToGoal) ? monthsToGoal : "-"}</strong><small>{Number.isFinite(monthsToGoal) ? "месяцев" : "недостижимо"}</small>
          </div>
        </section>

        <section className="detailStatsGrid">
          <article className="detailStatCard accent"><DollarSign size={24} /><span>Ежемесячный взнос</span><strong>{formatCurrency(scenario.monthly_contribution)} ₽</strong></article>
          <article className="detailStatCard"><TrendingUp size={24} /><span>Доп. рост</span><strong>{formatPercent(scenario.expected_return)}%</strong></article>
          <article className="detailStatCard"><Activity size={24} /><span>Инфляция</span><strong>{formatPercent(scenario.inflation_rate)}%</strong></article>
          <article className="detailStatCard"><Shield size={24} /><span>Риск</span><strong className={`riskBadge ${risk.className}`}>{risk.icon}{risk.level}</strong></article>
        </section>

        <section className="scenarioPurposeCard">
          <div className="scenarioPurposeHeader">
            <span><HelpCircle size={15} /> Зачем нужен сценарий</span>
            <h2>Проверить план до того, как менять цель</h2>
            <p>Сценарий помогает проверить план: сколько вносить каждый месяц, учитывать ли дополнительный рост накоплений и как инфляция влияет на примерный срок.</p>
          </div>
          <div className="scenarioPurposeGrid">
            <article>
              <strong>Срок</strong>
              <p>Пересчитывается по накопленной сумме, платежам, ежемесячному взносу, дополнительному росту и инфляции.</p>
            </article>
            <article>
              <strong>Дополнительный рост</strong>
              <p>Это необязательное поле. Если цель пополняется только вашими платежами, поставьте 0. Если хотите заложить рост суммы на 8% в год, укажите 8.</p>
            </article>
            <article>
              <strong>Риск</strong>
              <p>Чем выше дополнительный рост, тем менее осторожным считается сценарий.</p>
            </article>
          </div>
          <div className="scenarioExampleBox">
            <strong>Пример</strong>
            <p>Цель 100 000 ₽, уже накоплено 20 000 ₽, ежемесячный взнос 5 000 ₽. Если дополнительный рост 0%, система считает срок только по вашим платежам. Если указать рост 8% и инфляцию 6%, в расчёте останется около 2% реального роста, поэтому срок может немного сократиться.</p>
          </div>
        </section>

        <section className="detailWorkspace">
          <main className="detailCard" ref={editPanelRef}>
            <div className="detailCardHeader editableHeader">
              <div><span>Параметры</span><h2>Настройки сценария</h2></div>
              {!editMode && <button onClick={handleStartEdit} className="detailPrimaryButton" disabled={deleting}><Edit2 size={17} /> Редактировать</button>}
            </div>
            <div className="detailFormGrid">
              <EditableMetric label="Ежемесячный взнос" hint="Сколько вы планируете добавлять к цели каждый месяц. Например: 5 000 означает, что расчёт будет считать по 5 000 ₽ каждый месяц." icon={<DollarSign size={15} />} editMode={editMode} name="monthly_contribution" value={editData.monthly_contribution} onChange={handleEditChange} display={`${formatCurrency(scenario.monthly_contribution)} ₽`} />
              <EditableMetric label="Дополнительный рост, % в год" hint="Необязательное поле. Если вы просто копите деньги платежами, поставьте 0. Если хотите проверить вариант, где сумма дополнительно растёт, укажите процент за год: например, 8." icon={<TrendingUp size={15} />} editMode={editMode} name="expected_return" value={editData.expected_return} onChange={handleEditChange} display={`${formatPercent(scenario.expected_return)}%`} />
              <EditableMetric label="Ожидаемая инфляция" hint="На сколько процентов за год могут вырасти цены. Например: 6 означает, что покупательная способность денег снизится примерно на 6% за год. Система вычитает инфляцию из годового прироста." icon={<Activity size={15} />} editMode={editMode} name="inflation_rate" value={editData.inflation_rate} onChange={handleEditChange} display={`${formatPercent(scenario.inflation_rate)}%`} action={applyCurrentInflation} actionText={inflationLoading ? "Загружаем..." : "Подставить актуальную"} actionDisabled={inflationLoading} actionIcon={<RefreshCw size={14} />} note={inflationInfo} />
              <EditableMetric label="Целевая сумма" hint="Сумма, которую нужно накопить в этом сценарии. Можно указать другую сумму для проверки, не меняя саму цель." icon={<Target size={15} />} editMode={editMode} name="target_amount" value={editData.target_amount} onChange={handleEditChange} display={`${formatCurrency(scenario.target_amount || goal?.target_amount)} ₽`} />
            </div>
            {editMode && (
              <div className="detailEditActions">
                <button onClick={handleCancelEdit} className="detailGhostLight" disabled={saving}><X size={17} /> Отмена</button>
                <button onClick={handleSave} className="detailPrimaryButton" disabled={saving}><Save size={17} /> {saving ? "Сохраняем..." : "Сохранить"}</button>
              </div>
            )}
          </main>

          <aside className="detailCard side">
            <div className="detailCardHeader"><span>Расчёт</span><h2>Показатели</h2></div>
            <div className="calculationList">
              <div><span><Clock size={15} /> Срок</span><strong>{Number.isFinite(monthsToGoal) ? `${monthsToGoal} мес.` : "Недостижимо"}</strong></div>
              <div><span><TrendingUp size={15} /> Рост после инфляции</span><strong>{effectiveReturn}%</strong></div>
              <div><span><Target size={15} /> Осталось накопить</span><strong>{formatCurrency(metrics.remaining)} ₽</strong></div>
              <div><span><Shield size={15} /> Вероятность</span><strong>{metrics.probability}%</strong></div>
              <div><span><Activity size={15} /> Рейтинг</span><strong>{metrics.rating}/100</strong></div>
              <div><span><DollarSign size={15} /> Темп в день</span><strong>{formatCurrency(Math.ceil((parseFloat(scenario.monthly_contribution) || 0) / 30))} ₽</strong></div>
            </div>
          </aside>
        </section>

        {goal && (
          <section className="linkedGoalCard">
            <div className="detailCardHeader"><span>Связанная цель</span><h2>{goal.title}</h2></div>
            <div className="linkedGoalGrid">
              <div><span>Цель</span><strong>{formatCurrency(goal.target_amount)} ₽</strong></div>
              <div><span>Накоплено</span><strong>{formatCurrency(metrics.current)} ₽</strong></div>
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

function EditableMetric({ label, hint, icon, editMode, name, value, onChange, display, action, actionText, actionDisabled, actionIcon, note }) {
  return (
    <div className="editableMetric">
      <span>{icon} {label}</span>
      {editMode && hint && <p className="editableMetricHint">{hint}</p>}
      {editMode ? <input name={name} value={value || ""} onChange={onChange} /> : <strong>{display}</strong>}
      {editMode && action && (
        <button type="button" className="editableMetricAction" onClick={action} disabled={actionDisabled}>
          {actionIcon} {actionText}
        </button>
      )}
      {editMode && note && <p className="editableMetricNote">{note}</p>}
    </div>
  );
}

export default ScenarioDetailPage;
