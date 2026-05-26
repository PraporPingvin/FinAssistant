import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
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

function CheckpointFormModal({ goal, initialData, onSubmit, onClose, isEdit = false }) {
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

        <form onSubmit={handleSubmit}>
          <div className="formGroup">
            <label>Название <span className="required">*</span></label>
            <input type="text" name="title" value={formData.title} onChange={handleChange} placeholder="Например: Накопить 50%" disabled={submitting} />
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

  useEffect(() => {
    loadData();
  }, []);

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

  const isCheckpointOverdue = (checkpoint) => {
    if (checkpoint.status !== "pending") return false;
    if (!checkpoint.target_date) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const targetDate = new Date(checkpoint.target_date);
    targetDate.setHours(0, 0, 0, 0);
    return targetDate < today;
  };

  const updateOverdueStatus = async () => {
    const overdueCheckpoints = checkpoints.filter(cp => isCheckpointOverdue(cp));
    for (const cp of overdueCheckpoints) {
      try {
        await updateCheckpoint(cp.checkpoint_id, { status: "overdue" });
      } catch (error) {
        console.error(`Ошибка обновления точки ${cp.title}:`, error);
      }
    }
    if (overdueCheckpoints.length > 0) await loadData();
  };

  useEffect(() => {
    if (!loading && checkpoints.length > 0) updateOverdueStatus();
  }, [loading, checkpoints]);

  const handleMarkComplete = async (checkpointId) => {
    try {
      await updateCheckpoint(checkpointId, { status: "completed" });
      await loadData();
    } catch (error) {
      alert("Ошибка обновления статуса");
    }
  };

  const handleDelete = async (checkpointId, title) => {
    if (!window.confirm(`Удалить "${title}"?`)) return;
    try {
      await deleteCheckpoint(checkpointId);
      await loadData();
    } catch (error) {
      alert("Ошибка удаления");
    }
  };

  const handleCreateCheckpoint = async (checkpointData) => {
    try {
      await createCheckpoint(checkpointData);
      await loadData();
      setShowCreateModal(false);
      setSelectedGoal(null);
    } catch (error) {
      alert("Ошибка: " + error.message);
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
      alert("Ошибка: " + error.message);
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

  const formatDate = (dateString) => {
    if (!dateString) return "—";
    return new Date(dateString).toLocaleDateString('ru-RU');
  };

  const getStatusClass = (status) => {
    switch (status) {
      case "pending": return "statusPending";
      case "completed": return "statusCompleted";
      case "overdue": return "statusOverdue";
      default: return "";
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case "pending": return "В процессе";
      case "completed": return "Выполнено";
      case "overdue": return "Просрочено";
      default: return status;
    }
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
    if (filter !== "all" && cp.status !== filter) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return cp.title?.toLowerCase().includes(query) || getGoalTitle(cp.goal_id).toLowerCase().includes(query);
    }
    return true;
  });

  const sortedCheckpoints = [...filteredCheckpoints].sort((a, b) => {
    let comparison = 0;
    switch (sortBy) {
      case "date":
        const dateA = a.target_date ? new Date(a.target_date) : new Date(9999, 11, 31);
        const dateB = b.target_date ? new Date(b.target_date) : new Date(9999, 11, 31);
        comparison = dateA - dateB;
        break;
      case "status":
        const statusOrder = { "pending": 1, "overdue": 2, "completed": 3 };
        comparison = (statusOrder[a.status] || 99) - (statusOrder[b.status] || 99);
        break;
      case "priority":
        const priorityOrder = { "high": 1, "medium": 2, "low": 3 };
        comparison = (priorityOrder[a.priority] || 99) - (priorityOrder[b.priority] || 99);
        break;
      default: comparison = 0;
    }
    return sortOrder === "asc" ? comparison : -comparison;
  });

  const stats = {
    total: checkpoints.length,
    completed: checkpoints.filter(cp => cp.status === "completed").length,
    pending: checkpoints.filter(cp => cp.status === "pending" && !isCheckpointOverdue(cp)).length,
    overdue: checkpoints.filter(cp => cp.status === "overdue" || isCheckpointOverdue(cp)).length,
    highPriority: checkpoints.filter(cp => cp.priority === "high").length,
    mediumPriority: checkpoints.filter(cp => cp.priority === "medium").length,
    lowPriority: checkpoints.filter(cp => cp.priority === "low").length,
    completionRate: checkpoints.length > 0 ? Math.round((checkpoints.filter(cp => cp.status === "completed").length / checkpoints.length) * 100) : 0
  };

  // Данные для диаграмм
  const statusChartData = {
    labels: ['Выполнено', 'В процессе', 'Просрочено'],
    datasets: [{
      data: [stats.completed, stats.pending, stats.overdue],
      backgroundColor: ['#2E7D32', '#F5A623', '#E35D5D'],
      borderWidth: 0,
    }]
  };

  const priorityChartData = {
    labels: ['Высокий', 'Средний', 'Низкий'],
    datasets: [{
      data: [stats.highPriority, stats.mediumPriority, stats.lowPriority],
      backgroundColor: ['#E35D5D', '#F5A623', '#2E7D32'],
      borderWidth: 0,
    }]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: { usePointStyle: true, boxWidth: 10, font: { size: 11 } }
      },
      tooltip: { callbacks: { label: (ctx) => `${ctx.label}: ${ctx.raw}` } }
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
        <CheckpointFormModal goal={selectedGoal} onSubmit={handleCreateCheckpoint} onClose={() => { setShowCreateModal(false); setSelectedGoal(null); }} isEdit={false} />
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
          <div className="statLabel">Выполнено</div>
        </div>
        <div className="statCard">
          <div className="statIcon"><Clock size={24} /></div>
          <div className="statValue">{stats.pending}</div>
          <div className="statLabel">В процессе</div>
        </div>
        <div className="statCard warning">
          <div className="statIcon"><AlertCircle size={24} /></div>
          <div className="statValue">{stats.overdue}</div>
          <div className="statLabel">Просрочено</div>
        </div>
      </div>

      {/* Общий прогресс */}
      <div className="overallProgress">
        <div className="progressLabel">
          <span>Общий прогресс выполнения</span>
          <span className="progressPercent">{stats.completionRate}%</span>
        </div>
        <div className="progressBar">
          <div className="progressFill" style={{ width: `${stats.completionRate}%` }} />
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
      <div className="filtersBar">
        <div className="filterGroup">
          <select value={filter} onChange={(e) => setFilter(e.target.value)} className="filterSelect">
            <option value="all">Все статусы</option>
            <option value="pending">В процессе</option>
            <option value="completed">Выполнено</option>
            <option value="overdue">Просрочено</option>
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
        <button className="createButton" onClick={() => setShowGoalSelector(true)}><Plus size={14} /> Новая точка</button>
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
              <tr><th>Название</th><th>Цель</th><th>Сумма</th><th>Срок</th><th>Статус</th><th>Приоритет</th><th>Действия</th></tr>
            </thead>
            <tbody>
              {sortedCheckpoints.map(cp => {
                const isOverdue = isCheckpointOverdue(cp);
                return (
                  <tr key={cp.checkpoint_id} className={isOverdue || cp.status === "overdue" ? "overdueRow" : ""}>
                    <td><strong>{cp.title}</strong>{cp.description && <div className="checkpointDesc">{cp.description}</div>}</td>
                    <td>{getGoalTitle(cp.goal_id)}</td>
                    <td className="amountCell">{formatCurrency(cp.target_amount)} ₽</td>
                    <td>{formatDate(cp.target_date)}</td>
                    <td><span className={`tableStatusBadge ${getStatusClass(cp.status)}`}>{getStatusText(cp.status)}</span></td>
                    <td>{getPriorityIcon(cp.priority)} {getPriorityText(cp.priority)}</td>
                    <td className="tableActions">
                      {cp.status === "pending" && !isOverdue && <button className="tableAction complete" onClick={() => handleMarkComplete(cp.checkpoint_id)} title="Выполнено"><CheckCircle size={14} /></button>}
                      <button className="tableAction edit" onClick={() => handleEditClick(cp)} title="Редактировать"><Edit2 size={14} /></button>
                      <button className="tableAction view" onClick={() => navigate(`/goals/${cp.goal_id}`)} title="К цели"><Eye size={14} /></button>
                      <button className="tableAction delete" onClick={() => handleDelete(cp.checkpoint_id, cp.title)} title="Удалить"><Trash2 size={14} /></button>
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
            const isOverdue = isCheckpointOverdue(cp);
            return (
              <div key={cp.checkpoint_id} className={`checkpointCard ${isOverdue || cp.status === "overdue" ? "overdueCard" : ""}`}>
                <div className="checkpointHeader">
                  <div className="checkpointTitleSection">
                    <h3 className="checkpointTitle">{cp.title}</h3>
                    <div className="checkpointBadges">
                      <span className={`statusBadge ${getStatusClass(cp.status)}`}>{getStatusText(cp.status)}</span>
                      <span className="priorityBadge">{getPriorityIcon(cp.priority)} {getPriorityText(cp.priority)}</span>
                    </div>
                  </div>
                </div>
                <div className="checkpointContent">
                  <div className="checkpointGoal"><Target size={14} /><span className="goalTitle">{getGoalTitle(cp.goal_id)}</span></div>
                  <div className="checkpointDetails">
                    <div className="detailItem"><span className="detailLabel"><DollarSign size={12} /> Сумма:</span><span className="detailValue highlight">{formatCurrency(cp.target_amount)} ₽</span></div>
                    {cp.target_date && <div className="detailItem"><span className="detailLabel"><Calendar size={12} /> Срок:</span><span className={`detailValue ${isOverdue || cp.status === "overdue" ? "overdueText" : ""}`}>{formatDate(cp.target_date)}</span></div>}
                    {cp.description && <div className="detailItem description"><span className="detailLabel">📝</span><span className="detailValue">{cp.description}</span></div>}
                  </div>
                </div>
                <div className="checkpointActions">
                  {cp.status === "pending" && !isOverdue && <button className="actionButton complete" onClick={() => handleMarkComplete(cp.checkpoint_id)}><CheckCircle size={14} /> Выполнено</button>}
                  <button className="actionButton edit" onClick={() => handleEditClick(cp)}><Edit2 size={14} /> Редактировать</button>
                  <button className="actionButton view" onClick={() => navigate(`/goals/${cp.goal_id}`)}><Eye size={14} /> Цель</button>
                  <button className="actionButton delete" onClick={() => handleDelete(cp.checkpoint_id, cp.title)}><Trash2 size={14} /> Удалить</button>
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
          <button className="createFirstButton" onClick={() => setShowGoalSelector(true)}><Plus size={14} /> Создать первую точку</button>
        </div>
      )}
    </div>
  );
}

export default CheckpointsOverview;