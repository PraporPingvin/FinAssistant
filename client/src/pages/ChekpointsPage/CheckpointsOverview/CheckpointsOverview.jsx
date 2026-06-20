import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Target,
  CheckCircle,
  Clock,
  AlertCircle,
  Plus,
  Edit2,
  Trash2,
  Eye,
  X,
  Calendar,
  DollarSign,
  Flag,
  BarChart3,
  TrendingUp,
  PieChart as PieChartIcon,
  ChevronDown,
  ChevronUp,
  Search,
  Filter,
  List,
  LayoutGrid,
  Circle,
  CircleDot,
  CircleCheck,
} from "lucide-react";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Filler,
} from 'chart.js';
import { Pie, Doughnut, Bar } from 'react-chartjs-2';
import { getCheckpoints, getGoals, updateCheckpoint, deleteCheckpoint, createCheckpoint } from "../../../api/api";
import ModernDialog from "../../../components/ModernDialog/ModernDialog";
import "./CheckpointsOverview.css";

ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Filler
);

function GoalSelectorModal({ goals, onSelectGoal, onClose, formatCurrency }) {
  if (!goals.length) {
    return (
      <div className="modalOverlay" onClick={onClose}>
        <div className="modalContent" onClick={(e) => e.stopPropagation()}>
          <div className="modalHeader">
            <h3>Нет целей</h3>
            <button className="modalClose" onClick={onClose}><X size={18} /></button>
          </div>
          <p>Сначала создайте финансовую цель, чтобы добавить контрольные точки.</p>
          <button onClick={onClose} className="modalCloseBtn">Закрыть</button>
        </div>
      </div>
    );
  }

  return (
    <div className="modalOverlay" onClick={onClose}>
      <div className="modalContent" onClick={(e) => e.stopPropagation()}>
        <div className="modalHeader">
          <h3><Target size={18} /> Выберите цель</h3>
          <button className="modalClose" onClick={onClose}><X size={18} /></button>
        </div>
        <p className="modalSubtitle">Для какой цели добавить контрольную точку?</p>
        <div className="modalGoalList">
          {goals.map(goal => (
            <div key={goal.goal_id} className="modalGoalItem" onClick={() => onSelectGoal(goal)}>
              <div className="modalGoalInfo">
                <span className="modalGoalTitle">{goal.title}</span>
                <span className={`modalGoalStatus status-${goal.status}`}>
                  {goal.status === "active" ? "Активна" : goal.status === "completed" ? "Выполнена" : "Приостановлена"}
                </span>
              </div>
              <div className="modalGoalAmount">{formatCurrency(goal.target_amount)} ₽</div>
              <div className="modalGoalProgress">
                Прогресс: {Math.round((parseFloat(goal.current_amount) / parseFloat(goal.target_amount)) * 100)}%
              </div>
            </div>
          ))}
        </div>
        <button onClick={onClose} className="modalCloseBtn">Отмена</button>
      </div>
    </div>
  );
}

function CheckpointFormModal({ goal, goals = [], onGoalChange, initialData, onSubmit, onClose, isEdit = false }) {
  const [formData, setFormData] = useState({
    title: initialData?.title || "",
    target_amount: initialData?.target_amount || "",
    target_date: initialData?.target_date || "",
    priority: initialData?.priority || "medium",
    description: initialData?.description || "",
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: "" }));
  };

  const formatCurrency = (value) => {
    if (!value) return "0";
    return new Intl.NumberFormat('ru-RU').format(parseFloat(value));
  };

  const checkpointAmount = Number(formData.target_amount || 0);
  const currentAmount = Number(goal.current_amount || 0);
  const monthlyContribution = Number(goal.monthly_contribution || 0);
  const remainingToCheckpoint = Math.max(0, checkpointAmount - currentAmount);
  const monthsToCheckpoint = remainingToCheckpoint > 0 && monthlyContribution > 0
    ? Math.ceil(remainingToCheckpoint / monthlyContribution)
    : 0;
  const checkpointProgress = checkpointAmount > 0
    ? Math.min(100, Math.round((currentAmount / checkpointAmount) * 100))
    : 0;
  const plannedDate = formData.target_date ? new Date(formData.target_date) : null;
  const forecastDate = monthsToCheckpoint > 0 ? new Date() : null;
  if (forecastDate) forecastDate.setMonth(forecastDate.getMonth() + monthsToCheckpoint);
  const formScheduleText = remainingToCheckpoint <= 0
    ? "Эта точка уже достигнута"
    : !plannedDate
      ? "Добавьте дату, чтобы проверить, укладываетесь ли вы в срок"
      : monthlyContribution <= 0
        ? "Для прогноза нужно указать ежемесячный взнос в цели"
        : forecastDate <= plannedDate
          ? `При текущем взносе успеваете: прогноз ${forecastDate.toLocaleDateString("ru-RU")}`
          : `Есть риск не успеть: прогноз ${forecastDate.toLocaleDateString("ru-RU")}`;

  const validateForm = () => {
    const newErrors = {};
    if (!formData.title.trim()) newErrors.title = "Введите название";
    if (!formData.target_amount || parseFloat(formData.target_amount) <= 0) {
      newErrors.target_amount = "Введите корректную сумму";
    }
    if (formData.target_amount && parseFloat(formData.target_amount) > parseFloat(goal.target_amount)) {
      newErrors.target_amount = `Сумма не может быть больше ${formatCurrency(goal.target_amount)} ₽`;
    }
    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({
        goal_id: goal.goal_id,
        title: formData.title.trim(),
        target_amount: parseFloat(formData.target_amount),
        target_date: formData.target_date || null,
        priority: formData.priority,
        description: formData.description || "",
        status: initialData?.status || "pending"
      });
      if (!isEdit) {
        setFormData({ title: "", target_amount: "", target_date: "", priority: "medium", description: "" });
      }
    } catch (error) {
      setErrors({ submit: error.message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modalOverlay" onClick={onClose}>
      <div className="modalContent formModal" onClick={(e) => e.stopPropagation()}>
        <div className="modalHeader">
          <h3>{isEdit ? <Edit2 size={18} /> : <Plus size={18} />} {isEdit ? "Редактирование" : "Новая контрольная точка"}</h3>
          <button className="modalClose" onClick={onClose}><X size={18} /></button>
        </div>
        <p className="modalSubtitle"><Target size={14} /> Цель: {goal.title} ({formatCurrency(goal.target_amount)} ₽)</p>
        {!isEdit && goals.length > 1 && (
          <div className="formGroup">
            <label><Target size={14} /> Для какой цели создаем точку</label>
            <select value={goal.goal_id} onChange={(event) => onGoalChange?.(goals.find(item => String(item.goal_id) === event.target.value))}>
              {goals.map(item => <option key={item.goal_id} value={item.goal_id}>{item.title}</option>)}
            </select>
          </div>
        )}
        <p className="checkpointExampleHint">
          Например, точка «Накопить половину суммы» помогает видеть промежуточный результат. После ввода суммы ниже система покажет, сколько осталось и примерный срок.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="formGroup">
            <label>Название <span className="required">*</span></label>
            <input autoFocus={!isEdit} type="text" name="title" value={formData.title} onChange={handleChange} placeholder="Например: Накопить 50%" disabled={submitting} />
            {errors.title && <div className="formError">{errors.title}</div>}
          </div>

          <div className="formRow">
            <div className="formGroup">
              <label><DollarSign size={14} /> Сумма <span className="required">*</span></label>
              <input type="number" name="target_amount" value={formData.target_amount} onChange={handleChange} min="0" step="1000" disabled={submitting} />
              {formData.target_amount && <div className="preview">{formatCurrency(formData.target_amount)} ₽</div>}
              {errors.target_amount && <div className="formError">{errors.target_amount}</div>}
            </div>
            <div className="formGroup">
              <label><Calendar size={14} /> Дата выполнения</label>
              <input type="date" name="target_date" value={formData.target_date} onChange={handleChange} disabled={submitting} />
            </div>
          </div>

          {checkpointAmount > 0 && (
            <div className="checkpointCalculationExample">
              <strong>Пример расчета этой контрольной точки</strong>
              <span>Сейчас накоплено: {formatCurrency(currentAmount)} ₽ из {formatCurrency(checkpointAmount)} ₽</span>
              <div className="checkpointCalculationTrack">
                <div style={{ width: `${checkpointProgress}%` }} />
              </div>
              <span>
                {remainingToCheckpoint <= 0
                  ? "Контрольная точка уже достигнута"
                  : `Осталось ${formatCurrency(remainingToCheckpoint)} ₽${monthlyContribution > 0 ? `, примерно ${monthsToCheckpoint} мес.` : ""}`}
              </span>
              <strong>{formScheduleText}</strong>
            </div>
          )}

          <div className="formGroup">
            <label><Flag size={14} /> Приоритет</label>
            <select name="priority" value={formData.priority} onChange={handleChange} disabled={submitting}>
              <option value="high">Высокий</option>
              <option value="medium">Средний</option>
              <option value="low">Низкий</option>
            </select>
          </div>

          <div className="formGroup">
            <label>Описание</label>
            <textarea name="description" value={formData.description} onChange={handleChange} rows="3" placeholder="Дополнительная информация..." disabled={submitting} />
          </div>

          {errors.submit && <div className="submitError">{errors.submit}</div>}

          <div className="formButtons">
            <button type="button" onClick={onClose} className="cancelBtn" disabled={submitting}>Отмена</button>
            <button type="submit" className="submitBtn" disabled={submitting}>
              {submitting ? (isEdit ? "Сохранение..." : "Создание...") : (isEdit ? "Сохранить" : "Создать")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CheckpointsOverview() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [checkpoints, setCheckpoints] = useState([]);
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState("cards");
  const [sortBy, setSortBy] = useState("date");
  const [sortOrder, setSortOrder] = useState("asc");
  const [showCharts, setShowCharts] = useState(true);
  
  const [showGoalSelector, setShowGoalSelector] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState(null);
  const [editingCheckpoint, setEditingCheckpoint] = useState(null);
  const [checkpointToDelete, setCheckpointToDelete] = useState(null);
  const [notice, setNotice] = useState(null);
  const listStartRef = useRef(null);
  const createRequestHandledRef = useRef("");

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (loading || searchParams.get("create") !== "1") return;

    const requestKey = `${searchParams.get("create")}:${searchParams.get("goalId") || ""}`;
    if (createRequestHandledRef.current === requestKey) return;
    createRequestHandledRef.current = requestKey;

    if (goals.length === 0) {
      setSearchParams({}, { replace: true });
      navigate("/goals/new");
      return;
    }

    const requestedGoal = goals.find(item => String(item.goal_id) === searchParams.get("goalId"));
    setSelectedGoal(requestedGoal || goals[0]);
    setShowGoalSelector(false);
    setShowCreateModal(true);
    setSearchParams({}, { replace: true });
  }, [goals, loading, navigate, searchParams, setSearchParams]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [goalsData, checkpointsData] = await Promise.all([
        getGoals(),
        getCheckpoints().catch(() => [])
      ]);
      setGoals(goalsData);
      setCheckpoints(checkpointsData || []);
    } catch (err) {
      console.error("Ошибка загрузки:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkComplete = async (checkpointId) => {
    try {
      await updateCheckpoint(checkpointId, { status: "completed" });
      await loadData();
    } catch (error) {
      setNotice({ title: "Не удалось обновить статус", description: "Попробуйте повторить действие чуть позже." });
    }
  };

  const handleDelete = async () => {
    if (!checkpointToDelete) return;
    try {
      await deleteCheckpoint(checkpointToDelete.id);
      setCheckpointToDelete(null);
      await loadData();
    } catch (error) {
      setNotice({ title: "Не удалось удалить точку", description: "Данные остались без изменений." });
    }
  };

  const handleCreateCheckpoint = async (checkpointData) => {
    try {
      await createCheckpoint(checkpointData);
      await loadData();
      setShowCreateModal(false);
      setSelectedGoal(null);
    } catch (error) {
      setNotice({ title: "Не удалось создать точку", description: error.message });
    }
  };

  const handleUpdateCheckpoint = async (checkpointData) => {
    try {
      await updateCheckpoint(editingCheckpoint.checkpoint_id, {
        title: checkpointData.title,
        target_amount: checkpointData.target_amount,
        target_date: checkpointData.target_date,
        priority: checkpointData.priority,
        description: checkpointData.description
      });
      await loadData();
      setShowEditModal(false);
      setEditingCheckpoint(null);
    } catch (error) {
      setNotice({ title: "Не удалось сохранить точку", description: error.message });
    }
  };

  const handleEditClick = (checkpoint) => {
    const goal = goals.find(g => g.goal_id === checkpoint.goal_id);
    if (goal) {
      setEditingCheckpoint(checkpoint);
      setSelectedGoal(goal);
      setShowEditModal(true);
    }
  };

  const handleSelectGoal = (goal) => {
    setSelectedGoal(goal);
    setShowGoalSelector(false);
    setShowCreateModal(true);
  };

  const getGoalTitle = (goalId) => {
    const goal = goals.find(g => g.goal_id === goalId);
    return goal?.title || "Неизвестная цель";
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('ru-RU').format(amount || 0);
  };

  const openCreateForm = () => {
    if (goals.length === 0) {
      navigate("/goals/new");
      return;
    }
    setSelectedGoal(goals[0]);
    setShowCreateModal(true);
  };

  const showAttentionCheckpoints = () => {
    setFilter(stats.overdue > 0 ? "overdue" : "risk");
    setSearchQuery("");
    setViewMode("cards");
    requestAnimationFrame(() => {
      listStartRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const getCheckpointMetrics = (checkpoint) => {
    const goal = goals.find(item => item.goal_id === checkpoint.goal_id);
    const target = Number(checkpoint.target_amount || 0);
    const current = Number(goal?.current_amount || 0);
    const monthly = Number(goal?.monthly_contribution || 0);
    const remaining = Math.max(0, target - current);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const targetDate = checkpoint.target_date ? new Date(checkpoint.target_date) : null;
    if (targetDate) targetDate.setHours(0, 0, 0, 0);
    const daysToDeadline = targetDate
      ? Math.ceil((targetDate - today) / (1000 * 60 * 60 * 24))
      : null;
    const months = remaining > 0 && monthly > 0 ? Math.ceil(remaining / monthly) : 0;
    const forecastDate = months > 0 ? new Date(today) : null;
    if (forecastDate) forecastDate.setMonth(forecastDate.getMonth() + months);
    const forecastDelayDays = targetDate && forecastDate
      ? Math.ceil((forecastDate - targetDate) / (1000 * 60 * 60 * 24))
      : null;
    const contributionMonthsBeforeDeadline = daysToDeadline === null
      ? 0
      : Math.max(0, Math.floor(daysToDeadline / 30.44));
    const expectedByDeadline = current + monthly * contributionMonthsBeforeDeadline;
    const shortfallAtDeadline = Math.max(0, target - expectedByDeadline);
    const reserveAtDeadline = Math.max(0, expectedByDeadline - target);

    let status = "noDeadline";
    if (checkpoint.status === "completed" || remaining <= 0) status = "achieved";
    else if (daysToDeadline !== null && daysToDeadline < 0) status = "overdue";
    else if (monthly <= 0) status = "risk";
    else if (targetDate && forecastDate > targetDate) status = "risk";
    else if (targetDate) status = "onTrack";

    return {
      remaining,
      progress: target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0,
      months,
      daysToDeadline,
      forecastDate,
      forecastDelayDays,
      shortfallAtDeadline,
      reserveAtDeadline,
      status,
    };
  };

  const getCheckpointStatusText = (status) => ({
    achieved: "Достигнуто",
    onTrack: "Успеваем",
    risk: "Есть риск",
    overdue: "Срок прошел",
    noDeadline: "Без срока",
  }[status] || "Без статуса");

  const getCheckpointStatusClass = (status) => ({
    achieved: "statusCompleted",
    onTrack: "statusOnTrack",
    risk: "statusRisk",
    overdue: "statusOverdue",
    noDeadline: "statusNoDeadline",
  }[status] || "");

  const getCountdownText = (metrics) => {
    if (metrics.status === "achieved") return "Контрольная точка достигнута";
    if (metrics.daysToDeadline === null) return "Добавьте срок, чтобы проверить темп";
    if (metrics.daysToDeadline < 0) return `Срок прошел ${Math.abs(metrics.daysToDeadline)} дн. назад`;
    if (metrics.daysToDeadline === 0) return "Срок наступает сегодня";
    return `До срока осталось ${metrics.daysToDeadline} дн.`;
  };

  const getScheduleText = (metrics) => {
    if (metrics.status === "achieved") return "Нужная сумма уже накоплена";
    if (metrics.status === "noDeadline") return metrics.months > 0
      ? `При текущем взносе точка будет достигнута примерно за ${metrics.months} мес.`
      : "Укажите ежемесячный взнос для расчета";
    if (metrics.status === "overdue") return `Не хватает ${formatCurrency(metrics.remaining)} ₽`;
    if (metrics.status === "risk") {
      if (!metrics.months) return "Без ежемесячного взноса достичь точки к сроку не получится";
      return `К сроку не хватит примерно ${formatCurrency(metrics.shortfallAtDeadline)} ₽, прогноз опаздывает на ${Math.max(1, metrics.forecastDelayDays)} дн.`;
    }
    return metrics.reserveAtDeadline > 0
      ? `Успеваем, запас к сроку около ${formatCurrency(metrics.reserveAtDeadline)} ₽`
      : "Успеваем при сохранении текущего взноса";
  };

  const formatDate = (dateString) => {
    if (!dateString) return "—";
    return new Date(dateString).toLocaleDateString('ru-RU');
  };

  const getPriorityIcon = (priority) => {
    switch (priority) {
      case "high": return <CircleDot size={14} color="#E35D5D" />;
      case "medium": return <Circle size={14} color="#F5A623" />;
      case "low": return <CircleCheck size={14} color="#2E7D32" />;
      default: return <Circle size={14} />;
    }
  };

  const getPriorityText = (priority) => {
    switch (priority) {
      case "high": return "Высокий";
      case "medium": return "Средний";
      case "low": return "Низкий";
      default: return "";
    }
  };

  const filteredCheckpoints = checkpoints.filter(cp => {
    if (filter !== "all" && getCheckpointMetrics(cp).status !== filter) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return cp.title?.toLowerCase().includes(query) || getGoalTitle(cp.goal_id).toLowerCase().includes(query);
    }
    return true;
  });

  const sortedCheckpoints = [...filteredCheckpoints].sort((a, b) => {
    let comparison = 0;
    switch (sortBy) {
      case "date": {
        const dateA = a.target_date ? new Date(a.target_date) : new Date(9999, 11, 31);
        const dateB = b.target_date ? new Date(b.target_date) : new Date(9999, 11, 31);
        comparison = dateA - dateB;
        break;
      }
      case "status": {
        const statusOrder = { overdue: 1, risk: 2, onTrack: 3, noDeadline: 4, achieved: 5 };
        comparison = (statusOrder[getCheckpointMetrics(a).status] || 99) - (statusOrder[getCheckpointMetrics(b).status] || 99);
        break;
      }
      case "priority": {
        const priorityOrder = { "high": 1, "medium": 2, "low": 3 };
        comparison = (priorityOrder[a.priority] || 99) - (priorityOrder[b.priority] || 99);
        break;
      }
      default: comparison = 0;
    }
    return sortOrder === "asc" ? comparison : -comparison;
  });

  const checkpointPlans = checkpoints.map(checkpoint => ({
    checkpoint,
    metrics: getCheckpointMetrics(checkpoint),
  }));
  const checkpointMetrics = checkpointPlans.map(item => item.metrics);
  const nextCheckpointPlan = checkpointPlans
    .filter(item => item.metrics.status !== "achieved")
    .sort((a, b) => {
      if (a.metrics.daysToDeadline === null) return 1;
      if (b.metrics.daysToDeadline === null) return -1;
      return a.metrics.daysToDeadline - b.metrics.daysToDeadline;
    })[0] || null;
  const stats = {
    total: checkpoints.length,
    completed: checkpointMetrics.filter(item => item.status === "achieved").length,
    pending: checkpointMetrics.filter(item => item.status === "onTrack").length,
    overdue: checkpointMetrics.filter(item => item.status === "overdue").length,
    risk: checkpointMetrics.filter(item => item.status === "risk").length,
    highPriority: checkpoints.filter(cp => cp.priority === "high").length,
    mediumPriority: checkpoints.filter(cp => cp.priority === "medium").length,
    lowPriority: checkpoints.filter(cp => cp.priority === "low").length,
    completionRate: checkpoints.length > 0 ? Math.round((checkpointMetrics.filter(item => item.status === "achieved").length / checkpoints.length) * 100) : 0
  };

  // Данные для диаграмм
  const statusChartData = {
    labels: ['Достигнуто', 'Успеваем', 'Есть риск', 'Срок прошел'],
    datasets: [{
      data: [stats.completed, stats.pending, stats.risk, stats.overdue],
      backgroundColor: ['#27a66a', '#6f9b32', '#f0a13a', '#ff6b5f'],
      borderColor: '#ffffff',
      borderWidth: 4,
      hoverOffset: 12,
      spacing: 4,
    }]
  };

  const priorityChartData = {
    labels: ['Высокий', 'Средний', 'Низкий'],
    datasets: [{
      data: [stats.highPriority, stats.mediumPriority, stats.lowPriority],
      backgroundColor: ['#ff6b5f', '#f0a13a', '#27a66a'],
      borderColor: '#ffffff',
      borderWidth: 4,
      hoverOffset: 12,
      spacing: 4,
    }]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '68%',
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          usePointStyle: true,
          boxWidth: 8,
          boxHeight: 8,
          padding: 18,
          color: '#68745b',
          font: {
            family: 'Manrope, Aptos Display, Segoe UI, sans-serif',
            size: 12,
            weight: '700'
          }
        }
      },
      tooltip: {
        padding: 14,
        backgroundColor: 'rgba(24, 32, 22, 0.92)',
        titleColor: '#ffffff',
        bodyColor: 'rgba(255, 255, 255, 0.82)',
        borderColor: 'rgba(232, 244, 93, 0.35)',
        borderWidth: 1,
        callbacks: { label: (ctx) => `${ctx.label}: ${ctx.raw}` }
      }
    }
  };

  if (loading) {
    return <div className="loadingContainer"><div className="loadingSpinner" /><p>Загрузка...</p></div>;
  }

  return (
    <div className="checkpointsOverview">
      {showGoalSelector && (
        <GoalSelectorModal goals={goals} onSelectGoal={handleSelectGoal} onClose={() => setShowGoalSelector(false)} formatCurrency={formatCurrency} />
      )}
      {showCreateModal && selectedGoal && (
        <CheckpointFormModal goal={selectedGoal} goals={goals} onGoalChange={setSelectedGoal} onSubmit={handleCreateCheckpoint} onClose={() => { setShowCreateModal(false); setSelectedGoal(null); }} isEdit={false} />
      )}
      {showEditModal && editingCheckpoint && selectedGoal && (
        <CheckpointFormModal goal={selectedGoal} initialData={{ title: editingCheckpoint.title, target_amount: editingCheckpoint.target_amount, target_date: editingCheckpoint.target_date, priority: editingCheckpoint.priority, description: editingCheckpoint.description }} onSubmit={handleUpdateCheckpoint} onClose={() => { setShowEditModal(false); setEditingCheckpoint(null); setSelectedGoal(null); }} isEdit={true} />
      )}

      {/* Статистика */}
      <div className="statsCards">
        <div className="statCard">
          <div className="statIcon"><List size={24} /></div>
          <div className="statValue">{stats.total}</div>
          <div className="statLabel">Всего точек</div>
        </div>
        <div className="statCard">
          <div className="statIcon"><CheckCircle size={24} /></div>
          <div className="statValue">{stats.completed}</div>
          <div className="statLabel">Достигнуто</div>
        </div>
        <div className="statCard">
          <div className="statIcon"><Clock size={24} /></div>
          <div className="statValue">{stats.pending}</div>
          <div className="statLabel">Успеваем</div>
        </div>
        <div className="statCard warning">
          <div className="statIcon"><AlertCircle size={24} /></div>
          <div className="statValue">{stats.risk + stats.overdue}</div>
          <div className="statLabel">Требуют внимания</div>
        </div>
      </div>

      {nextCheckpointPlan && (
        <section className={`nextCheckpointFocus focus-${nextCheckpointPlan.metrics.status}`}>
          <div className="nextCheckpointFocusIcon"><Target size={26} /></div>
          <div className="nextCheckpointFocusContent">
            <span>Ближайшая контрольная точка</span>
            <h3>{nextCheckpointPlan.checkpoint.title}</h3>
            <p>{getCountdownText(nextCheckpointPlan.metrics)}. {getScheduleText(nextCheckpointPlan.metrics)}.</p>
          </div>
          <div className="nextCheckpointFocusAmount">
            <span>Осталось накопить</span>
            <strong>{formatCurrency(nextCheckpointPlan.metrics.remaining)} ₽</strong>
            <small>{nextCheckpointPlan.metrics.progress}% уже выполнено</small>
          </div>
          <div className="nextCheckpointFocusActions">
            <button type="button" onClick={() => navigate(`/goals/${nextCheckpointPlan.checkpoint.goal_id}/payments/new`)}>Внести платеж</button>
            <button type="button" className="secondary" onClick={() => navigate(`/goals/${nextCheckpointPlan.checkpoint.goal_id}`)}>Открыть цель</button>
          </div>
        </section>
      )}

      {stats.risk + stats.overdue > 0 && (
        <section className="checkpointNotice">
          <AlertCircle size={22} />
          <div>
            <strong>Контрольные точки требуют внимания</strong>
            <p>Есть риск не успеть или срок уже прошел. Пополните цель либо скорректируйте сумму и дату точки.</p>
          </div>
          <button type="button" onClick={showAttentionCheckpoints}>Показать</button>
        </section>
      )}

      {/* Общий прогресс */}
      <div className="overallProgress">
        <div className="progressLabel">
          <span>Общий прогресс выполнения</span>
          <span className="progressPercent">{stats.completionRate}%</span>
        </div>
        <div className="progressBar">
          <div className="progressFill" style={{ width: `${stats.completionRate}%` }} />
        </div>
        <div className="checkpointProgressSummary" aria-label="Краткая сводка контрольных точек">
          <div>
            <span>Всего</span>
            <strong>{stats.total}</strong>
          </div>
          <div>
            <span>Достигнуто</span>
            <strong>{stats.completed}</strong>
          </div>
          <div>
            <span>Успеваем</span>
            <strong>{stats.pending}</strong>
          </div>
          <div>
            <span>Внимание</span>
            <strong>{stats.risk + stats.overdue}</strong>
          </div>
        </div>
      </div>

      {/* Диаграммы */}
      {showCharts && checkpoints.length > 0 && (
        <div className="chartsSection">
          <div className="chartsHeader">
            <h3><BarChart3 size={16} /> Аналитика контрольных точек</h3>
            <button className="toggleCharts" onClick={() => setShowCharts(false)}>Скрыть</button>
          </div>
          <div className="chartsGrid">
            <div className="chartCard">
              <h4>По статусам</h4>
              <div className="chartContainer">
                <Doughnut data={statusChartData} options={chartOptions} />
              </div>
            </div>
            <div className="chartCard">
              <h4>По приоритетам</h4>
              <div className="chartContainer">
                <Pie data={priorityChartData} options={chartOptions} />
              </div>
            </div>
          </div>
        </div>
      )}

      {!showCharts && checkpoints.length > 0 && (
        <button className="showChartsButton" onClick={() => setShowCharts(true)}>
          <BarChart3 size={14} /> Показать графики
        </button>
      )}

      {/* Фильтры */}
      <div ref={listStartRef} className="checkpointsListAnchor" />

      <div className="filtersBar">
        <div className="filterGroup">
          <select value={filter} onChange={(e) => setFilter(e.target.value)} className="filterSelect">
            <option value="all">Все статусы</option>
            <option value="onTrack">Успеваем</option>
            <option value="risk">Есть риск</option>
            <option value="overdue">Срок прошел</option>
            <option value="achieved">Достигнуто</option>
            <option value="noDeadline">Без срока</option>
          </select>
        </div>
        <div className="filterGroup">
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="filterSelect">
            <option value="date">По дате</option>
            <option value="status">По статусу</option>
            <option value="priority">По приоритету</option>
          </select>
        </div>
        <button className="sortOrderButton" onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}>
          {sortOrder === "asc" ? "↑" : "↓"}
        </button>
        <div className="searchGroup">
          <input type="text" placeholder="Поиск..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="searchInput" />
          {searchQuery && <button className="clearSearch" onClick={() => setSearchQuery("")}>✕</button>}
        </div>
        <button className="createButton" onClick={openCreateForm}><Plus size={14} /> Новая точка</button>
        <button className={`viewModeButton ${viewMode === "table" ? "active" : ""}`} onClick={() => setViewMode(viewMode === "cards" ? "table" : "cards")}>
          {viewMode === "cards" ? <LayoutGrid size={14} /> : <List size={14} />}
          {viewMode === "cards" ? "Карточки" : "Таблица"}
        </button>
      </div>

      {/* Таблица */}
      {viewMode === "table" && sortedCheckpoints.length > 0 && (
        <div className="tableContainer">
          <table className="checkpointsTable">
            <thead>
              <tr><th>Название</th><th>Цель</th><th>Сумма</th><th>Осталось</th><th>Срок</th><th>Статус</th><th>Приоритет</th><th>Действия</th></tr>
            </thead>
            <tbody>
              {sortedCheckpoints.map(cp => {
                const metrics = getCheckpointMetrics(cp);
                return (
                  <tr key={cp.checkpoint_id} className={`${metrics.status}Row`}>
                    <td><strong>{cp.title}</strong>{cp.description && <div className="checkpointDesc">{cp.description}</div>}</td>
                    <td>{getGoalTitle(cp.goal_id)}</td>
                    <td className="amountCell">{formatCurrency(cp.target_amount)} ₽</td>
                    <td><strong>{formatCurrency(metrics.remaining)} ₽</strong><div className="checkpointDesc">{getScheduleText(metrics)}</div></td>
                    <td><strong>{formatDate(cp.target_date)}</strong><div className="checkpointDesc">{getCountdownText(metrics)}</div></td>
                    <td><span className={`tableStatusBadge ${getCheckpointStatusClass(metrics.status)}`}>{getCheckpointStatusText(metrics.status)}</span></td>
                    <td>{getPriorityIcon(cp.priority)} {getPriorityText(cp.priority)}</td>
                    <td className="tableActions">
                      {metrics.status !== "achieved" && <button className="tableAction complete" onClick={() => handleMarkComplete(cp.checkpoint_id)} title="Отметить достигнутой"><CheckCircle size={14} /></button>}
                      {metrics.status !== "achieved" && <button className="tableAction edit" onClick={() => handleEditClick(cp)} title="Редактировать"><Edit2 size={14} /></button>}
                      <button className="tableAction view" onClick={() => navigate(`/goals/${cp.goal_id}`)} title="К цели"><Eye size={14} /></button>
                      <button className="tableAction delete" onClick={() => setCheckpointToDelete({ id: cp.checkpoint_id, title: cp.title })} title="Удалить"><Trash2 size={14} /></button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Карточки */}
      {viewMode === "cards" && sortedCheckpoints.length > 0 && (
        <div className="checkpointsList">
          {sortedCheckpoints.map(cp => {
            const metrics = getCheckpointMetrics(cp);
            return (
              <div key={cp.checkpoint_id} className={`checkpointCard checkpoint-${metrics.status}`}>
                <div className="checkpointHeader">
                  <div className="checkpointTitleSection">
                    <h3 className="checkpointTitle">{cp.title}</h3>
                    <div className="checkpointBadges">
                      <span className={`statusBadge ${getCheckpointStatusClass(metrics.status)}`}>{getCheckpointStatusText(metrics.status)}</span>
                      <span className="priorityBadge">{getPriorityIcon(cp.priority)} {getPriorityText(cp.priority)}</span>
                    </div>
                  </div>
                </div>
                <div className="checkpointContent">
                  <div className="checkpointGoal"><Target size={14} /><span className="goalTitle">{getGoalTitle(cp.goal_id)}</span></div>
                  <div className="checkpointDetails">
                    <div className="detailItem"><span className="detailLabel"><DollarSign size={12} /> Сумма:</span><span className="detailValue highlight">{formatCurrency(cp.target_amount)} ₽</span></div>
                    <div className="detailItem"><span className="detailLabel"><Target size={12} /> Осталось:</span><span className="detailValue highlight">{formatCurrency(metrics.remaining)} ₽</span></div>
                    <div className="checkpointCalculation">
                      <div className="checkpointCalculationMeta"><span>{getCountdownText(metrics)}</span><strong>{metrics.progress}%</strong></div>
                      <div className="checkpointCalculationTrack"><div style={{ width: `${metrics.progress}%` }} /></div>
                      <small>{getScheduleText(metrics)}</small>
                    </div>
                    {metrics.forecastDate && metrics.status !== "achieved" && <div className="detailItem"><span className="detailLabel"><TrendingUp size={12} /> Прогноз:</span><span className="detailValue">{formatDate(metrics.forecastDate)}</span></div>}
                    {cp.target_date && <div className="detailItem"><span className="detailLabel"><Calendar size={12} /> Срок:</span><span className={`detailValue ${metrics.status === "overdue" ? "overdueText" : ""}`}>{formatDate(cp.target_date)}</span></div>}
                    {cp.description && <div className="detailItem description"><span className="detailLabel">📝</span><span className="detailValue">{cp.description}</span></div>}
                  </div>
                </div>
                <div className="checkpointActions">
                  {metrics.status !== "achieved" && <button className="actionButton complete" onClick={() => handleMarkComplete(cp.checkpoint_id)}><CheckCircle size={14} /> Отметить достигнутой</button>}
                  {metrics.status !== "achieved" && <button className="actionButton edit" onClick={() => handleEditClick(cp)}><Edit2 size={14} /> Редактировать</button>}
                  <button className="actionButton view" onClick={() => navigate(`/goals/${cp.goal_id}`)}><Eye size={14} /> Цель</button>
                  {metrics.status !== "achieved" && <button className="actionButton payment" onClick={() => navigate(`/goals/${cp.goal_id}/payments/new`)}><DollarSign size={14} /> Внести платеж</button>}
                  <button className="actionButton delete" onClick={() => setCheckpointToDelete({ id: cp.checkpoint_id, title: cp.title })}><Trash2 size={14} /> Удалить</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Пустое состояние */}
      {viewMode === "cards" && sortedCheckpoints.length === 0 && (
        <div className="emptyState">
          <div className="emptyIcon">📌</div>
          <h3>Контрольных точек пока нет</h3>
          <p>Нажмите кнопку «Новая точка» и выберите цель для добавления первой контрольной точки</p>
          <button className="createFirstButton" onClick={openCreateForm}><Plus size={14} /> Создать первую точку</button>
        </div>
      )}

      <ModernDialog
        open={Boolean(checkpointToDelete)}
        variant="danger"
        eyebrow="Контрольная точка"
        title="Удалить точку?"
        description={`Контрольная точка "${checkpointToDelete?.title || "Без названия"}" будет удалена из плана цели.`}
        cancelText="Отмена"
        confirmText="Удалить"
        onCancel={() => setCheckpointToDelete(null)}
        onConfirm={handleDelete}
      />

      <ModernDialog
        open={Boolean(notice)}
        variant="info"
        eyebrow="Уведомление"
        title={notice?.title || ""}
        description={notice?.description || ""}
        confirmText="Понятно"
        onClose={() => setNotice(null)}
        onConfirm={() => setNotice(null)}
      />
    </div>
  );
}

export default CheckpointsOverview;
