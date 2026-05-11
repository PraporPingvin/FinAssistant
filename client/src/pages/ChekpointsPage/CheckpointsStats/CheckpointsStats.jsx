// client/src/pages/CheckpointsPage/CheckpointsStats.jsx
import React, { useEffect, useState } from "react";
import { getGoals, getCheckpoints, getScenarios } from "../../../api/api";
import "./CheckpointsStats.css";

function CheckpointsStats() {
  const [goals, setGoals] = useState([]);
  const [checkpoints, setCheckpoints] = useState([]);
  const [scenariosMap, setScenariosMap] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const goalsData = await getGoals();
      const checkpointsData = await getCheckpoints().catch(() => []);
      
      setGoals(goalsData);
      setCheckpoints(checkpointsData || []);
      
      const scenariosTemp = {};
      for (const goal of goalsData) {
        try {
          const scenarios = await getScenarios(goal.goal_id);
          scenariosTemp[goal.goal_id] = scenarios || [];
        } catch (error) {
          scenariosTemp[goal.goal_id] = [];
        }
      }
      setScenariosMap(scenariosTemp);
    } catch (error) {
      console.error("Ошибка загрузки:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('ru-RU').format(amount || 0);
  };

  const calculateStats = () => {
    const totalGoals = goals.length;
    const activeGoals = goals.filter(g => g.status === "active").length;
    const completedGoals = goals.filter(g => g.status === "completed").length;
    
    const totalCheckpoints = checkpoints.length;
    const completedCheckpoints = checkpoints.filter(cp => cp.status === "completed").length;
    const pendingCheckpoints = checkpoints.filter(cp => cp.status === "pending").length;
    const overdueCheckpoints = checkpoints.filter(cp => {
      if (cp.status !== "pending") return false;
      return cp.target_date && new Date(cp.target_date) < new Date();
    }).length;
    
    const highPriority = checkpoints.filter(cp => cp.priority === "high").length;
    const mediumPriority = checkpoints.filter(cp => cp.priority === "medium").length;
    const lowPriority = checkpoints.filter(cp => cp.priority === "low").length;
    
    const totalScenarios = Object.values(scenariosMap).reduce((sum, arr) => sum + arr.length, 0);
    
    const totalTarget = goals.reduce((sum, g) => sum + (parseFloat(g.target_amount) || 0), 0);
    const totalCurrent = goals.reduce((sum, g) => sum + (parseFloat(g.current_amount) || 0), 0);
    const totalProgress = totalTarget > 0 ? Math.round((totalCurrent / totalTarget) * 100) : 0;
    
    return {
      goals: { total: totalGoals, active: activeGoals, completed: completedGoals },
      checkpoints: { 
        total: totalCheckpoints, 
        completed: completedCheckpoints, 
        pending: pendingCheckpoints,
        overdue: overdueCheckpoints,
        completionRate: totalCheckpoints > 0 ? Math.round((completedCheckpoints / totalCheckpoints) * 100) : 0
      },
      priorities: { high: highPriority, medium: mediumPriority, low: lowPriority },
      scenarios: { total: totalScenarios },
      finances: {
        totalTarget,
        totalCurrent,
        totalProgress,
        remaining: totalTarget - totalCurrent
      }
    };
  };

  if (loading) {
    return (
      <div className="stats-loading">
        <div className="loading-spinner"></div>
        <p>Загрузка статистики...</p>
      </div>
    );
  }

  const stats = calculateStats();

  return (
    <div className="stats-page">
      <div className="stats-section">
        <h3>🎯 Цели</h3>
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">📊</div>
            <div className="stat-content">
              <div className="stat-value">{stats.goals.total}</div>
              <div className="stat-label">Всего целей</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">✅</div>
            <div className="stat-content">
              <div className="stat-value">{stats.goals.active}</div>
              <div className="stat-label">Активных</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">🏆</div>
            <div className="stat-content">
              <div className="stat-value">{stats.goals.completed}</div>
              <div className="stat-label">Выполнено</div>
            </div>
          </div>
        </div>
      </div>

      <div className="stats-section">
        <h3>📌 Контрольные точки</h3>
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">📋</div>
            <div className="stat-content">
              <div className="stat-value">{stats.checkpoints.total}</div>
              <div className="stat-label">Всего точек</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">✅</div>
            <div className="stat-content">
              <div className="stat-value">{stats.checkpoints.completed}</div>
              <div className="stat-label">Выполнено</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">⏳</div>
            <div className="stat-content">
              <div className="stat-value">{stats.checkpoints.pending}</div>
              <div className="stat-label">В процессе</div>
            </div>
          </div>
          <div className="stat-card warning">
            <div className="stat-icon">⚠️</div>
            <div className="stat-content">
              <div className="stat-value">{stats.checkpoints.overdue}</div>
              <div className="stat-label">Просрочено</div>
            </div>
          </div>
        </div>

        <div className="progress-bar-container">
          <div className="progress-label">
            <span>Прогресс выполнения</span>
            <span>{stats.checkpoints.completionRate}%</span>
          </div>
          <div className="progress-bar">
            <div 
              className="progress-fill"
              style={{ width: `${stats.checkpoints.completionRate}%` }}
            />
          </div>
        </div>
      </div>

      <div className="stats-section">
        <h3>⚡ Приоритеты</h3>
        <div className="stats-grid priorities">
          <div className="priority-card high">
            <div className="priority-icon">🔴</div>
            <div className="priority-content">
              <div className="priority-value">{stats.priorities.high}</div>
              <div className="priority-label">Высокий</div>
            </div>
          </div>
          <div className="priority-card medium">
            <div className="priority-icon">🟡</div>
            <div className="priority-content">
              <div className="priority-value">{stats.priorities.medium}</div>
              <div className="priority-label">Средний</div>
            </div>
          </div>
          <div className="priority-card low">
            <div className="priority-icon">🟢</div>
            <div className="priority-content">
              <div className="priority-value">{stats.priorities.low}</div>
              <div className="priority-label">Низкий</div>
            </div>
          </div>
        </div>
      </div>

      <div className="stats-section">
        <h3>💰 Финансы</h3>
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">🎯</div>
            <div className="stat-content">
              <div className="stat-value">{formatCurrency(stats.finances.totalTarget)} ₽</div>
              <div className="stat-label">Всего нужно</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">💵</div>
            <div className="stat-content">
              <div className="stat-value">{formatCurrency(stats.finances.totalCurrent)} ₽</div>
              <div className="stat-label">Накоплено</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">📈</div>
            <div className="stat-content">
              <div className="stat-value">{stats.finances.totalProgress}%</div>
              <div className="stat-label">Общий прогресс</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">⏳</div>
            <div className="stat-content">
              <div className="stat-value">{formatCurrency(stats.finances.remaining)} ₽</div>
              <div className="stat-label">Осталось</div>
            </div>
          </div>
        </div>
      </div>

      <div className="stats-section">
        <h3>📈 Сценарии</h3>
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">📊</div>
            <div className="stat-content">
              <div className="stat-value">{stats.scenarios.total}</div>
              <div className="stat-label">Всего сценариев</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">🎯</div>
            <div className="stat-content">
              <div className="stat-value">{goals.filter(g => (scenariosMap[g.goal_id] || []).length > 0).length}</div>
              <div className="stat-label">Целей с прогнозом</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CheckpointsStats;