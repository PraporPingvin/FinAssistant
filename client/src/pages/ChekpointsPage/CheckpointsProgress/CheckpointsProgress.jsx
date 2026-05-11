// client/src/pages/CheckpointsPage/CheckpointsProgress.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getGoals, getCheckpoints } from "../../../api/api";
import "./CheckpointsProgress.css";

function CheckpointsProgress() {
  const navigate = useNavigate();
  const [goals, setGoals] = useState([]);
  const [checkpoints, setCheckpoints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedGoal, setExpandedGoal] = useState(null);

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
    } catch (error) {
      console.error("Ошибка загрузки:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('ru-RU').format(amount || 0);
  };

  const calculateProgress = (goal) => {
    const target = parseFloat(goal.target_amount) || 1;
    const current = parseFloat(goal.current_amount) || 0;
    return Math.min(Math.round((current / target) * 100), 100);
  };

  const getGoalCheckpoints = (goalId) => {
    return checkpoints.filter(cp => cp.goal_id === goalId);
  };

  const getCheckpointsStats = (goalId) => {
    const goalCheckpoints = getGoalCheckpoints(goalId);
    const total = goalCheckpoints.length;
    const completed = goalCheckpoints.filter(cp => cp.status === "completed").length;
    const pending = goalCheckpoints.filter(cp => cp.status === "pending").length;
    const overdue = goalCheckpoints.filter(cp => {
      if (cp.status !== "pending") return false;
      return cp.target_date && new Date(cp.target_date) < new Date();
    }).length;
    
    return { total, completed, pending, overdue };
  };

  const calculateForecast = (goal) => {
    const target = parseFloat(goal.target_amount) || 0;
    const current = parseFloat(goal.current_amount) || 0;
    const monthly = parseFloat(goal.monthly_contribution) || 0;
    
    if (monthly <= 0) return null;
    
    const remaining = target - current;
    if (remaining <= 0) return { months: 0, date: new Date() };
    
    const months = Math.ceil(remaining / monthly);
    const date = new Date();
    date.setMonth(date.getMonth() + months);
    
    return { months, date };
  };

  if (loading) {
    return (
      <div className="progress-loading">
        <div className="loading-spinner"></div>
        <p>Загрузка прогресса...</p>
      </div>
    );
  }

  return (
    <div className="progress-page">
      <div className="goals-progress-grid">
        {goals.map(goal => {
          const progress = calculateProgress(goal);
          const stats = getCheckpointsStats(goal.goal_id);
          const forecast = calculateForecast(goal);
          const isExpanded = expandedGoal === goal.goal_id;
          
          return (
            <div key={goal.goal_id} className="goal-progress-card">
              <div 
                className="goal-progress-header"
                onClick={() => setExpandedGoal(isExpanded ? null : goal.goal_id)}
              >
                <div className="goal-title-section">
                  <h3 className="goal-title">{goal.title}</h3>
                  <span className={`goal-status status-${goal.status}`}>
                    {goal.status === "active" ? "Активна" : 
                     goal.status === "completed" ? "Выполнена" : "Приостановлена"}
                  </span>
                </div>
                
                <div className="goal-progress-preview">
                  <div className="progress-percent">{progress}%</div>
                  <span className="expand-icon">{isExpanded ? "▼" : "▶"}</span>
                </div>
              </div>

              <div className="progress-bar-container">
                <div 
                  className="progress-bar-fill"
                  style={{ width: `${progress}%` }}
                />
              </div>

              <div className="goal-stats">
                <div className="stat-row">
                  <span className="stat-label">Цель:</span>
                  <span className="stat-value">{formatCurrency(goal.target_amount)} ₽</span>
                </div>
                <div className="stat-row">
                  <span className="stat-label">Накоплено:</span>
                  <span className="stat-value highlight">{formatCurrency(goal.current_amount)} ₽</span>
                </div>
                <div className="stat-row">
                  <span className="stat-label">Осталось:</span>
                  <span className="stat-value">{formatCurrency(goal.target_amount - goal.current_amount)} ₽</span>
                </div>
              </div>

              {forecast && (
                <div className="forecast-info">
                  <div className="forecast-icon">🔮</div>
                  <div className="forecast-text">
                    {forecast.months === 0 ? (
                      "Цель достигнута!"
                    ) : (
                      <>
                        Прогноз: <strong>{forecast.months} месяцев</strong>
                        <span className="forecast-date">
                          (до {forecast.date.toLocaleDateString('ru-RU')})
                        </span>
                      </>
                    )}
                  </div>
                </div>
              )}

              {stats.total > 0 && (
                <div className="checkpoints-preview">
                  <div className="checkpoints-stats">
                    <span className="checkpoints-count">
                      📌 Контрольных точек: {stats.total}
                    </span>
                    <div className="checkpoints-breakdown">
                      {stats.completed > 0 && <span className="completed">✅ {stats.completed}</span>}
                      {stats.pending > 0 && <span className="pending">⏳ {stats.pending}</span>}
                      {stats.overdue > 0 && <span className="overdue">⚠️ {stats.overdue}</span>}
                    </div>
                  </div>
                </div>
              )}

              {isExpanded && stats.total > 0 && (
                <div className="goal-checkpoints-list">
                  <h4>Контрольные точки</h4>
                  {getGoalCheckpoints(goal.goal_id).map(cp => (
                    <div key={cp.checkpoint_id} className="checkpoint-mini-item">
                      <div className="checkpoint-mini-header">
                        <span className="checkpoint-mini-title">{cp.title}</span>
                        <span className={`checkpoint-mini-status status-${cp.status}`}>
                          {cp.status === "completed" ? "✅" : 
                           cp.status === "pending" ? "⏳" : "⚠️"}
                        </span>
                      </div>
                      <div className="checkpoint-mini-details">
                        <span>{formatCurrency(cp.target_amount)} ₽</span>
                        {cp.target_date && (
                          <span>{new Date(cp.target_date).toLocaleDateString('ru-RU')}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="goal-actions">
                <button 
                  className="action-button"
                  onClick={() => navigate(`/goals/${goal.goal_id}`)}
                >
                  👁️ Детали цели
                </button>
                <button 
                  className="action-button primary"
                  onClick={() => navigate(`/scenarios/${goal.goal_id}`)}
                >
                  📈 Сценарии
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default CheckpointsProgress;