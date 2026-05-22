// client/src/pages/CheckpointsPage/CheckpointsOverview.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getCheckpoints, getGoals, updateCheckpoint, deleteCheckpoint, createCheckpoint } from "../../../api/api";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Filler
} from 'chart.js';
import { Pie, Bar, Doughnut } from 'react-chartjs-2';
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

// ==================== МОДАЛЬНОЕ ОКНО ВЫБОРА ЦЕЛИ ====================
function GoalSelectorModal({ goals, onSelectGoal, onClose, formatCurrency }) {
  if (!goals.length) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <h3>⚠️ Нет целей</h3>
          <p>Сначала создайте финансовую цель, чтобы добавить контрольные точки.</p>
          <button onClick={onClose} className="modal-close-btn">Закрыть</button>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h3>🎯 Выберите цель</h3>
        <p className="modal-subtitle">Для какой цели добавить контрольную точку?</p>
        <div className="modal-goal-list">
          {goals.map(goal => (
            <div 
              key={goal.goal_id} 
              className="modal-goal-item"
              onClick={() => onSelectGoal(goal)}
            >
              <div className="modal-goal-info">
                <span className="modal-goal-title">{goal.title}</span>
                <span className="modal-goal-status">
                  {goal.status === "active" ? "🟢 Активна" : goal.status === "completed" ? "✅ Выполнена" : "⏸ Приостановлена"}
                </span>
              </div>
              <div className="modal-goal-amount">
                {formatCurrency(goal.target_amount)} ₽
              </div>
              <div className="modal-goal-progress">
                Прогресс: {Math.round((parseFloat(goal.current_amount) / parseFloat(goal.target_amount)) * 100)}%
              </div>
            </div>
          ))}
        </div>
        <button onClick={onClose} className="modal-close-btn">Отмена</button>
      </div>
    </div>
  );
}

// ==================== ФОРМА СОЗДАНИЯ/РЕДАКТИРОВАНИЯ (МОДАЛЬНАЯ) ====================
function CheckpointFormModal({ 
  goal, 
  initialData, 
  onSubmit, 
  onClose, 
  isEdit = false 
}) {
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
        setFormData({
          title: "",
          target_amount: "",
          target_date: "",
          priority: "medium",
          description: "",
        });
      }
    } catch (error) {
      setErrors({ submit: error.message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content form-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{isEdit ? "✏️ Редактирование" : "➕ Новая контрольная точка"}</h3>
          <button className="modal-close-x" onClick={onClose}>✕</button>
        </div>
        <p className="modal-subtitle">🎯 Цель: {goal.title} ({formatCurrency(goal.target_amount)} ₽)</p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Название *</label>
            <input type="text" name="title" value={formData.title} onChange={handleChange} placeholder="Например: Накопить 50%" disabled={submitting} />
            {errors.title && <div className="error">{errors.title}</div>}
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Сумма *</label>
              <input type="number" name="target_amount" value={formData.target_amount} onChange={handleChange} min="0" step="1000" disabled={submitting} />
              {formData.target_amount && <div className="preview">{formatCurrency(formData.target_amount)} ₽</div>}
              {errors.target_amount && <div className="error">{errors.target_amount}</div>}
            </div>
            <div className="form-group">
              <label>Дата выполнения</label>
              <input type="date" name="target_date" value={formData.target_date} onChange={handleChange} disabled={submitting} />
            </div>
          </div>

          <div className="form-group">
            <label>Приоритет</label>
            <select name="priority" value={formData.priority} onChange={handleChange} disabled={submitting}>
              <option value="high">🔴 Высокий</option>
              <option value="medium">🟡 Средний</option>
              <option value="low">🟢 Низкий</option>
            </select>
          </div>

          <div className="form-group">
            <label>Описание</label>
            <textarea name="description" value={formData.description} onChange={handleChange} rows="3" placeholder="Дополнительная информация..." disabled={submitting} />
          </div>

          {errors.submit && <div className="error submit-error">{errors.submit}</div>}

          <div className="form-buttons">
            <button type="button" onClick={onClose} className="cancel-btn" disabled={submitting}>Отмена</button>
            <button type="submit" className="submit-btn" disabled={submitting}>
              {submitting ? (isEdit ? "Сохранение..." : "Создание...") : (isEdit ? "Сохранить" : "Создать")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ==================== ОСНОВНОЙ КОМПОНЕНТ ====================
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
  
  // Состояния для модальных окон
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

  // Проверка, просрочена ли контрольная точка
  const isCheckpointOverdue = (checkpoint) => {
    if (checkpoint.status !== "pending") return false;
    if (!checkpoint.target_date) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const targetDate = new Date(checkpoint.target_date);
    targetDate.setHours(0, 0, 0, 0);
    return targetDate < today;
  };

  // Обновление статуса просроченных точек (автоматически при загрузке)
  const updateOverdueStatus = async () => {
    const overdueCheckpoints = checkpoints.filter(cp => isCheckpointOverdue(cp));
    for (const cp of overdueCheckpoints) {
      try {
        await updateCheckpoint(cp.checkpoint_id, { status: "overdue" });
        console.log(`✅ Обновлена просроченная точка: ${cp.title}`);
      } catch (error) {
        console.error(`Ошибка обновления точки ${cp.title}:`, error);
      }
    }
    if (overdueCheckpoints.length > 0) {
      await loadData(); // Перезагружаем данные после обновления
    }
  };

  // Запускаем проверку просроченных точек после загрузки
  useEffect(() => {
    if (!loading && checkpoints.length > 0) {
      updateOverdueStatus();
    }
  }, [loading, checkpoints]);

  // Обработчики действий
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
      alert("✅ Контрольная точка создана!");
    } catch (error) {
      alert("❌ Ошибка: " + error.message);
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
      alert("✅ Контрольная точка обновлена!");
    } catch (error) {
      alert("❌ Ошибка: " + error.message);
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
      case "pending": return "status-pending";
      case "completed": return "status-completed";
      case "overdue": return "status-overdue";
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
      case "high": return "🔴";
      case "medium": return "🟡";
      case "low": return "🟢";
      default: return "⚪";
    }
  };

  // Фильтрация и сортировка
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

  // Статистика для графиков (с учётом просроченных)
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

  const statusChartData = {
    labels: ['Выполнено', 'В процессе', 'Просрочено'],
    datasets: [{ data: [stats.completed, stats.pending, stats.overdue], backgroundColor: ['#4caf50', '#2196f3', '#f44336'] }]
  };

  const priorityChartData = {
    labels: ['Высокий', 'Средний', 'Низкий'],
    datasets: [{ data: [stats.highPriority, stats.mediumPriority, stats.lowPriority], backgroundColor: ['#f44336', '#ff9800', '#4caf50'] }]
  };

  if (loading) {
    return <div className="overview-loading"><div className="loading-spinner"></div><p>Загрузка...</p></div>;
  }

  return (
    <div className="checkpoints-overview">
      {/* МОДАЛЬНОЕ ОКНО ВЫБОРА ЦЕЛИ */}
      {showGoalSelector && (
        <GoalSelectorModal
          goals={goals}
          onSelectGoal={handleSelectGoal}
          onClose={() => setShowGoalSelector(false)}
          formatCurrency={formatCurrency}
        />
      )}

      {/* МОДАЛЬНОЕ ОКНО СОЗДАНИЯ */}
      {showCreateModal && selectedGoal && (
        <CheckpointFormModal
          goal={selectedGoal}
          onSubmit={handleCreateCheckpoint}
          onClose={() => {
            setShowCreateModal(false);
            setSelectedGoal(null);
          }}
          isEdit={false}
        />
      )}

      {/* МОДАЛЬНОЕ ОКНО РЕДАКТИРОВАНИЯ */}
      {showEditModal && editingCheckpoint && selectedGoal && (
        <CheckpointFormModal
          goal={selectedGoal}
          initialData={{
            title: editingCheckpoint.title,
            target_amount: editingCheckpoint.target_amount,
            target_date: editingCheckpoint.target_date,
            priority: editingCheckpoint.priority,
            description: editingCheckpoint.description
          }}
          onSubmit={handleUpdateCheckpoint}
          onClose={() => {
            setShowEditModal(false);
            setEditingCheckpoint(null);
            setSelectedGoal(null);
          }}
          isEdit={true}
        />
      )}

      {/* СТАТИСТИКА */}
      <div className="stats-cards">
        <div className="stat-card"><div className="stat-icon">📋</div><div className="stat-content"><div className="stat-value">{stats.total}</div><div className="stat-label">Всего точек</div></div></div>
        <div className="stat-card"><div className="stat-icon">✅</div><div className="stat-content"><div className="stat-value">{stats.completed}</div><div className="stat-label">Выполнено</div></div></div>
        <div className="stat-card"><div className="stat-icon">⏳</div><div className="stat-content"><div className="stat-value">{stats.pending}</div><div className="stat-label">В процессе</div></div></div>
        <div className="stat-card warning"><div className="stat-icon">⚠️</div><div className="stat-content"><div className="stat-value">{stats.overdue}</div><div className="stat-label">Просрочено</div></div></div>
      </div>

      {/* ПРОГРЕСС */}
      <div className="overall-progress">
        <div className="progress-label"><span>Общий прогресс выполнения</span><span className="progress-percent">{stats.completionRate}%</span></div>
        <div className="progress-bar"><div className="progress-fill" style={{ width: `${stats.completionRate}%` }} /></div>
      </div>

      {/* ГРАФИКИ (АНАЛИТИКА) */}
      {showCharts && checkpoints.length > 0 && (
        <div className="charts-section">
          <div className="charts-header"><h3>📊 Аналитика контрольных точек</h3><button className="toggle-charts" onClick={() => setShowCharts(false)}>Скрыть</button></div>
          <div className="charts-grid">
            <div className="chart-card"><h4>По статусам</h4><div className="chart-container"><Pie data={statusChartData} options={{ plugins: { legend: { position: 'bottom' } } }} /></div></div>
            <div className="chart-card"><h4>По приоритетам</h4><div className="chart-container"><Doughnut data={priorityChartData} options={{ plugins: { legend: { position: 'bottom' } } }} /></div></div>
          </div>
        </div>
      )}

      {!showCharts && checkpoints.length > 0 && (
        <button className="show-charts-button" onClick={() => setShowCharts(true)}>📊 Показать графики</button>
      )}

      {/* ФИЛЬТРЫ И КНОПКА СОЗДАНИЯ */}
      <div className="filters-bar">
        <div className="filter-group">
          <select value={filter} onChange={(e) => setFilter(e.target.value)} className="filter-select">
            <option value="all">Все статусы</option>
            <option value="pending">В процессе</option>
            <option value="completed">Выполнено</option>
            <option value="overdue">Просрочено</option>
          </select>
        </div>

        <div className="filter-group">
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="filter-select">
            <option value="date">По дате</option>
            <option value="status">По статусу</option>
            <option value="priority">По приоритету</option>
          </select>
        </div>

        <button className="sort-order-button" onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}>
          {sortOrder === "asc" ? "↑" : "↓"}
        </button>

        <div className="search-group">
          <input type="text" placeholder="🔍 Поиск..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="search-input" />
          {searchQuery && <button className="clear-search" onClick={() => setSearchQuery("")}>✕</button>}
        </div>

        {/* КНОПКА СОЗДАНИЯ НОВОЙ ТОЧКИ */}
        <button className="create-button" onClick={() => setShowGoalSelector(true)}>
          ➕ Новая точка
        </button>

        <button className={`view-mode-button ${viewMode === "table" ? "active" : ""}`} onClick={() => setViewMode(viewMode === "cards" ? "table" : "cards")}>
          {viewMode === "cards" ? "📋 Таблица" : "🃏 Карточки"}
        </button>
      </div>

      {/* ТАБЛИЦА */}
      {viewMode === "table" && sortedCheckpoints.length > 0 && (
        <div className="table-container">
          <table className="checkpoints-table">
            <thead>
              <tr><th>Название</th><th>Цель</th><th>Сумма</th><th>Срок</th><th>Статус</th><th>Приоритет</th><th>Действия</th></tr>
            </thead>
            <tbody>
              {sortedCheckpoints.map(cp => {
                const isOverdue = isCheckpointOverdue(cp);
                return (
                  <tr key={cp.checkpoint_id} className={isOverdue || cp.status === "overdue" ? "overdue-row" : ""}>
                    <td><strong>{cp.title}</strong>{cp.description && <div className="checkpoint-desc">{cp.description}</div>}</td>
                    <td>{getGoalTitle(cp.goal_id)}</td>
                    <td className="amount-cell">{formatCurrency(cp.target_amount)} ₽</td>
                    <td>{formatDate(cp.target_date)}</td>
                    <td><span className={`table-status-badge ${getStatusClass(cp.status)}`}>
                      {getStatusText(cp.status)}
                      {(isOverdue || cp.status === "overdue") && <span className="overdue-badge"> ⚠️</span>}
                    </span></td>
                    <td><span className="table-priority-badge">{getPriorityIcon(cp.priority)}</span></td>
                    <td className="table-actions">
                      {cp.status === "pending" && !isOverdue && <button className="table-action complete" onClick={() => handleMarkComplete(cp.checkpoint_id)} title="Выполнено">✅</button>}
                      <button className="table-action edit" onClick={() => handleEditClick(cp)} title="Редактировать">✏️</button>
                      <button className="table-action view" onClick={() => navigate(`/goals/${cp.goal_id}`)} title="К цели">👁️</button>
                      <button className="table-action delete" onClick={() => handleDelete(cp.checkpoint_id, cp.title)} title="Удалить">🗑️</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* КАРТОЧКИ */}
      {viewMode === "cards" && sortedCheckpoints.length > 0 && (
        <div className="checkpoints-list">
          {sortedCheckpoints.map(cp => {
            const isOverdue = isCheckpointOverdue(cp);
            return (
              <div key={cp.checkpoint_id} className={`checkpoint-card ${isOverdue || cp.status === "overdue" ? "overdue-card" : ""}`}>
                <div className="checkpoint-header">
                  <div className="checkpoint-title-section">
                    <h3 className="checkpoint-title">{cp.title}</h3>
                    <div className="checkpoint-badges">
                      <span className={`status-badge ${getStatusClass(cp.status)}`}>
                        {getStatusText(cp.status)}
                        {(isOverdue || cp.status === "overdue") && <span className="overdue-badge"> ⚠️</span>}
                      </span>
                      <span className="priority-badge">{getPriorityIcon(cp.priority)} {cp.priority === "high" ? "Высокий" : cp.priority === "medium" ? "Средний" : "Низкий"}</span>
                    </div>
                  </div>
                </div>
                <div className="checkpoint-content">
                  <div className="checkpoint-goal"><span className="goal-icon">🎯</span><span className="goal-title">{getGoalTitle(cp.goal_id)}</span></div>
                  <div className="checkpoint-details">
                    <div className="detail-item"><span className="detail-label">Сумма:</span><span className="detail-value highlight">{formatCurrency(cp.target_amount)} ₽</span></div>
                    {cp.target_date && <div className="detail-item"><span className="detail-label">Срок:</span><span className={`detail-value ${isOverdue || cp.status === "overdue" ? "overdue-text" : ""}`}>{formatDate(cp.target_date)}</span></div>}
                    {cp.description && <div className="detail-item description"><span className="detail-label">📝</span><span className="detail-value">{cp.description}</span></div>}
                  </div>
                </div>
                <div className="checkpoint-actions">
                  {cp.status === "pending" && !isOverdue && <button className="action-button complete" onClick={() => handleMarkComplete(cp.checkpoint_id)}>✅ Выполнено</button>}
                  <button className="action-button edit" onClick={() => handleEditClick(cp)}>✏️ Редактировать</button>
                  <button className="action-button view" onClick={() => navigate(`/goals/${cp.goal_id}`)}>👁️ Цель</button>
                  <button className="action-button delete" onClick={() => handleDelete(cp.checkpoint_id, cp.title)}>🗑️</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Пустое состояние */}
      {viewMode === "cards" && sortedCheckpoints.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon">📌</div>
          <h3>Контрольных точек пока нет</h3>
          <p>Нажмите кнопку «Новая точка» и выберите цель для добавления первой контрольной точки</p>
          <button className="create-first-button" onClick={() => setShowGoalSelector(true)}>➕ Создать первую точку</button>
        </div>
      )}
    </div>
  );
}

export default CheckpointsOverview;