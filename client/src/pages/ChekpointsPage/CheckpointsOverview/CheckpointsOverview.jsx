// client/src/pages/CheckpointsPage/CheckpointsOverview.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getCheckpoints, getGoals, updateCheckpoint, deleteCheckpoint } from "../../../api/api";
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

// Регистрируем компоненты ChartJS
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

function CheckpointsOverview() {
  const navigate = useNavigate();
  const [checkpoints, setCheckpoints] = useState([]);
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState("cards"); // cards или table
  const [sortBy, setSortBy] = useState("date");
  const [sortOrder, setSortOrder] = useState("asc");
  const [showCharts, setShowCharts] = useState(true);

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
      setError("Не удалось загрузить данные");
    } finally {
      setLoading(false);
    }
  };

  const handleMarkComplete = async (checkpointId) => {
    try {
      await updateCheckpoint(checkpointId, { status: "completed" });
      await loadData();
    } catch (error) {
      console.error("Ошибка:", error);
      alert("Не удалось обновить статус");
    }
  };

  const handleDelete = async (checkpointId, title) => {
    if (!window.confirm(`Удалить контрольную точку "${title}"?`)) return;
    
    try {
      await deleteCheckpoint(checkpointId);
      await loadData();
    } catch (error) {
      console.error("Ошибка удаления:", error);
      alert("Не удалось удалить контрольную точку");
    }
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
      case "cancelled": return "status-cancelled";
      default: return "";
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case "pending": return "В процессе";
      case "completed": return "Выполнено";
      case "overdue": return "Просрочено";
      case "cancelled": return "Отменено";
      default: return status;
    }
  };

  const getPriorityClass = (priority) => {
    switch (priority) {
      case "high": return "priority-high";
      case "medium": return "priority-medium";
      case "low": return "priority-low";
      default: return "";
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
      return cp.title?.toLowerCase().includes(query) || 
             getGoalTitle(cp.goal_id).toLowerCase().includes(query);
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
        const statusOrder = { "pending": 1, "overdue": 2, "completed": 3, "cancelled": 4 };
        comparison = (statusOrder[a.status] || 99) - (statusOrder[b.status] || 99);
        break;
      case "priority":
        const priorityOrder = { "high": 1, "medium": 2, "low": 3 };
        comparison = (priorityOrder[a.priority] || 99) - (priorityOrder[b.priority] || 99);
        break;
      default:
        comparison = 0;
    }
    return sortOrder === "asc" ? comparison : -comparison;
  });

  // Статистика для графиков
  const stats = {
    total: checkpoints.length,
    completed: checkpoints.filter(cp => cp.status === "completed").length,
    pending: checkpoints.filter(cp => cp.status === "pending").length,
    overdue: checkpoints.filter(cp => {
      if (cp.status !== "pending") return false;
      return cp.target_date && new Date(cp.target_date) < new Date();
    }).length,
    cancelled: checkpoints.filter(cp => cp.status === "cancelled").length,
    highPriority: checkpoints.filter(cp => cp.priority === "high").length,
    mediumPriority: checkpoints.filter(cp => cp.priority === "medium").length,
    lowPriority: checkpoints.filter(cp => cp.priority === "low").length,
    completionRate: checkpoints.length > 0 
      ? Math.round((checkpoints.filter(cp => cp.status === "completed").length / checkpoints.length) * 100) 
      : 0
  };

  // Данные для графиков
  const statusChartData = {
    labels: ['Выполнено', 'В процессе', 'Просрочено', 'Отменено'],
    datasets: [{
      data: [stats.completed, stats.pending, stats.overdue, stats.cancelled],
      backgroundColor: ['#4caf50', '#2196f3', '#f44336', '#9e9e9e'],
      borderWidth: 1
    }]
  };

  const priorityChartData = {
    labels: ['Высокий', 'Средний', 'Низкий'],
    datasets: [{
      data: [stats.highPriority, stats.mediumPriority, stats.lowPriority],
      backgroundColor: ['#f44336', '#ff9800', '#4caf50'],
      borderWidth: 1
    }]
  };

  const monthlyProgressData = {
    labels: ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'],
    datasets: [{
      label: 'Выполнено контрольных точек',
      data: [12, 19, 15, 17, 14, 13, 15, 20, 18, 16, 14, 12],
      backgroundColor: 'rgba(73, 86, 49, 0.5)',
      borderColor: '#495631',
      borderWidth: 2
    }]
  };

  if (loading) {
    return (
      <div className="overview-loading">
        <div className="loading-spinner"></div>
        <p>Загрузка контрольных точек...</p>
      </div>
    );
  }

  return (
    <div className="checkpoints-overview">
      {/* Статистика */}
      <div className="stats-cards">
        <div className="stat-card">
          <div className="stat-icon">📋</div>
          <div className="stat-content">
            <div className="stat-value">{stats.total}</div>
            <div className="stat-label">Всего точек</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">✅</div>
          <div className="stat-content">
            <div className="stat-value">{stats.completed}</div>
            <div className="stat-label">Выполнено</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">⏳</div>
          <div className="stat-content">
            <div className="stat-value">{stats.pending}</div>
            <div className="stat-label">В процессе</div>
          </div>
        </div>
        <div className="stat-card warning">
          <div className="stat-icon">⚠️</div>
          <div className="stat-content">
            <div className="stat-value">{stats.overdue}</div>
            <div className="stat-label">Просрочено</div>
          </div>
        </div>
      </div>

      {/* Прогресс-бар общего выполнения */}
      <div className="overall-progress">
        <div className="progress-label">
          <span>Общий прогресс выполнения</span>
          <span className="progress-percent">{stats.completionRate}%</span>
        </div>
        <div className="progress-bar">
          <div 
            className="progress-fill"
            style={{ width: `${stats.completionRate}%` }}
          />
        </div>
      </div>

      {/* Графики */}
      {showCharts && checkpoints.length > 0 && (
        <div className="charts-section">
          <div className="charts-header">
            <h3>📊 Аналитика контрольных точек</h3>
            <button 
              className="toggle-charts"
              onClick={() => setShowCharts(false)}
            >
              Скрыть
            </button>
          </div>
          <div className="charts-grid">
            <div className="chart-card">
              <h4>По статусам</h4>
              <div className="chart-container">
                <Pie data={statusChartData} options={{
                  plugins: {
                    legend: { position: 'bottom' },
                    tooltip: {
                      callbacks: {
                        label: (context) => {
                          const label = context.label || '';
                          const value = context.raw || 0;
                          const percentage = ((value / stats.total) * 100).toFixed(1);
                          return `${label}: ${value} (${percentage}%)`;
                        }
                      }
                    }
                  }
                }} />
              </div>
              <div className="chart-legend">
                <div className="legend-item">
                  <span className="legend-color" style={{ background: '#4caf50' }}></span>
                  <span>Выполнено: {stats.completed}</span>
                </div>
                <div className="legend-item">
                  <span className="legend-color" style={{ background: '#2196f3' }}></span>
                  <span>В процессе: {stats.pending}</span>
                </div>
                <div className="legend-item">
                  <span className="legend-color" style={{ background: '#f44336' }}></span>
                  <span>Просрочено: {stats.overdue}</span>
                </div>
                <div className="legend-item">
                  <span className="legend-color" style={{ background: '#9e9e9e' }}></span>
                  <span>Отменено: {stats.cancelled}</span>
                </div>
              </div>
            </div>

            <div className="chart-card">
              <h4>По приоритетам</h4>
              <div className="chart-container">
                <Doughnut data={priorityChartData} options={{
                  plugins: {
                    legend: { position: 'bottom' },
                    tooltip: {
                      callbacks: {
                        label: (context) => {
                          const label = context.label || '';
                          const value = context.raw || 0;
                          const percentage = ((value / stats.total) * 100).toFixed(1);
                          return `${label}: ${value} (${percentage}%)`;
                        }
                      }
                    }
                  }
                }} />
              </div>
              <div className="chart-legend">
                <div className="legend-item">
                  <span className="legend-color" style={{ background: '#f44336' }}></span>
                  <span>Высокий: {stats.highPriority}</span>
                </div>
                <div className="legend-item">
                  <span className="legend-color" style={{ background: '#ff9800' }}></span>
                  <span>Средний: {stats.mediumPriority}</span>
                </div>
                <div className="legend-item">
                  <span className="legend-color" style={{ background: '#4caf50' }}></span>
                  <span>Низкий: {stats.lowPriority}</span>
                </div>
              </div>
            </div>

            <div className="chart-card full-width">
              <h4>Динамика выполнения по месяцам</h4>
              <div className="chart-container" style={{ height: '300px' }}>
                <Bar data={monthlyProgressData} options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { display: false },
                    tooltip: {
                      callbacks: {
                        label: (context) => {
                          return `Выполнено: ${context.raw} точек`;
                        }
                      }
                    }
                  },
                  scales: {
                    y: {
                      beginAtZero: true,
                      ticks: {
                        stepSize: 5
                      }
                    }
                  }
                }} />
              </div>
            </div>
          </div>
        </div>
      )}

      {!showCharts && (
        <button 
          className="show-charts-button"
          onClick={() => setShowCharts(true)}
        >
          📊 Показать графики
        </button>
      )}

      {/* Фильтры и поиск */}
      <div className="filters-bar">
        <div className="filter-group">
          <select 
            value={filter} 
            onChange={(e) => setFilter(e.target.value)}
            className="filter-select"
          >
            <option value="all">Все статусы</option>
            <option value="pending">В процессе</option>
            <option value="completed">Выполнено</option>
            <option value="overdue">Просрочено</option>
          </select>
        </div>

        <div className="filter-group">
          <select 
            value={sortBy} 
            onChange={(e) => setSortBy(e.target.value)}
            className="filter-select"
          >
            <option value="date">По дате</option>
            <option value="status">По статусу</option>
            <option value="priority">По приоритету</option>
          </select>
        </div>

        <button 
          className="sort-order-button"
          onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
        >
          {sortOrder === "asc" ? "↑" : "↓"}
        </button>

        <div className="search-group">
          <input
            type="text"
            placeholder="🔍 Поиск по названию или цели..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
          {searchQuery && (
            <button 
              className="clear-search"
              onClick={() => setSearchQuery("")}
            >
              ✕
            </button>
          )}
        </div>

        <button 
          className={`view-mode-button ${viewMode === "table" ? "active" : ""}`}
          onClick={() => setViewMode(viewMode === "cards" ? "table" : "cards")}
        >
          {viewMode === "cards" ? "📋 Таблица" : "🃏 Карточки"}
        </button>

        <button 
          className="create-button"
          onClick={() => navigate("/goals")}
        >
          ➕ Новая точка
        </button>
      </div>

      {/* Таблица контрольных точек */}
      {viewMode === "table" && sortedCheckpoints.length > 0 && (
        <div className="table-container">
          <table className="checkpoints-table">
            <thead>
              <tr>
                <th>Название</th>
                <th>Цель</th>
                <th>Сумма</th>
                <th>Срок</th>
                <th>Статус</th>
                <th>Приоритет</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              {sortedCheckpoints.map(cp => (
                <tr key={cp.checkpoint_id}>
                  <td><strong>{cp.title}</strong></td>
                  <td>{getGoalTitle(cp.goal_id)}</td>
                  <td className="amount-cell">{formatCurrency(cp.target_amount)} ₽</td>
                  <td>{formatDate(cp.target_date)}</td>
                  <td>
                    <span className={`table-status-badge ${getStatusClass(cp.status)}`}>
                      {getStatusText(cp.status)}
                    </span>
                  </td>
                  <td>
                    <span className={`table-priority-badge ${getPriorityClass(cp.priority)}`}>
                      {getPriorityIcon(cp.priority)}
                    </span>
                  </td>
                  <td className="table-actions">
                    {cp.status === "pending" && (
                      <button 
                        className="table-action complete"
                        onClick={() => handleMarkComplete(cp.checkpoint_id)}
                        title="Отметить выполненным"
                      >
                        ✅
                      </button>
                    )}
                    <button 
                      className="table-action view"
                      onClick={() => navigate(`/goals/${cp.goal_id}`)}
                      title="Перейти к цели"
                    >
                      👁️
                    </button>
                    <button 
                      className="table-action delete"
                      onClick={() => handleDelete(cp.checkpoint_id, cp.title)}
                      title="Удалить"
                    >
                      🗑️
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Карточки контрольных точек */}
      {viewMode === "cards" && sortedCheckpoints.length > 0 ? (
        <div className="checkpoints-list">
          {sortedCheckpoints.map(cp => (
            <div key={cp.checkpoint_id} className="checkpoint-card">
              <div className="checkpoint-header">
                <div className="checkpoint-title-section">
                  <h3 className="checkpoint-title">{cp.title}</h3>
                  <div className="checkpoint-badges">
                    <span className={`status-badge ${getStatusClass(cp.status)}`}>
                      {getStatusText(cp.status)}
                    </span>
                    <span className={`priority-badge ${getPriorityClass(cp.priority)}`}>
                      {getPriorityIcon(cp.priority)} {cp.priority === "high" ? "Высокий" : 
                                                       cp.priority === "medium" ? "Средний" : "Низкий"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="checkpoint-content">
                <div className="checkpoint-goal">
                  <span className="goal-icon">🎯</span>
                  <span className="goal-title">{getGoalTitle(cp.goal_id)}</span>
                </div>

                <div className="checkpoint-details">
                  <div className="detail-item">
                    <span className="detail-label">Сумма:</span>
                    <span className="detail-value highlight">
                      {formatCurrency(cp.target_amount)} ₽
                    </span>
                  </div>

                  {cp.target_date && (
                    <div className="detail-item">
                      <span className="detail-label">Срок:</span>
                      <span className={`detail-value ${new Date(cp.target_date) < new Date() && cp.status === "pending" ? "overdue-text" : ""}`}>
                        {formatDate(cp.target_date)}
                        {new Date(cp.target_date) < new Date() && cp.status === "pending" && (
                          <span className="overdue-badge">Просрочено!</span>
                        )}
                      </span>
                    </div>
                  )}

                  {cp.description && (
                    <div className="detail-item description">
                      <span className="detail-label">📝</span>
                      <span className="detail-value">{cp.description}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="checkpoint-actions">
                {cp.status === "pending" && (
                  <button 
                    className="action-button complete"
                    onClick={() => handleMarkComplete(cp.checkpoint_id)}
                  >
                    ✅ Выполнено
                  </button>
                )}
                <button 
                  className="action-button view"
                  onClick={() => navigate(`/goals/${cp.goal_id}`)}
                >
                  👁️ Цель
                </button>
                <button 
                  className="action-button delete"
                  onClick={() => handleDelete(cp.checkpoint_id, cp.title)}
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : viewMode === "cards" && sortedCheckpoints.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon">📌</div>
          <h3>Контрольных точек пока нет</h3>
          <p>Создайте контрольные точки для отслеживания прогресса по целям</p>
          <button 
            className="create-first-button"
            onClick={() => navigate("/goals")}
          >
            Создать первую точку
          </button>
        </div>
      )}
    </div>
  );
}

export default CheckpointsOverview;