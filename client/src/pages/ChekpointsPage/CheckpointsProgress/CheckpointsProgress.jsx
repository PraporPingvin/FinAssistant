import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Target,
  TrendingUp,
  DollarSign,
  Calendar,
  Eye,
  BarChart3,
  Clock,
  AlertCircle,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { getGoals, getCheckpoints } from "../../../api/api";
import { calculateScenarioMetrics } from "../../../utils/scenarioCalculations";
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
    const metrics = calculateScenarioMetrics({
      goal,
      scenario: {
        monthly_contribution: goal.monthly_contribution,
        expected_return: 0,
        inflation_rate: 0,
      },
    });
    if (!Number.isFinite(metrics.monthsToGoal)) return null;

    const months = metrics.monthsToGoal;
    const date = new Date();
    date.setMonth(date.getMonth() + months);

    return { months, date };
  };

  const getStatusClass = (status) => {
    switch (status) {
      case "active": return "statusActive";
      case "completed": return "statusCompleted";
      case "paused": return "statusPaused";
      default: return "";
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case "active": return "Активна";
      case "completed": return "Выполнена";
      case "paused": return "Приостановлена";
      default: return status;
    }
  };

  if (loading) {
    return (
      <div className="progressLoading">
        <div className="loadingSpinner" />
        <p>Загрузка прогресса...</p>
      </div>
    );
  }

  return (
    <div className="progressPage">
      <div className="goalsProgressGrid">
        {goals.map(goal => {
          const progress = calculateProgress(goal);
          const stats = getCheckpointsStats(goal.goal_id);
          const forecast = calculateForecast(goal);
          const isExpanded = expandedGoal === goal.goal_id;
          
          return (
            <div key={goal.goal_id} className="goalProgressCard">
              <div 
                className="goalProgressHeader"
                onClick={() => setExpandedGoal(isExpanded ? null : goal.goal_id)}
              >
                <div className="goalTitleSection">
                  <h3 className="goalTitle">{goal.title}</h3>
                  <span className={`goalStatus ${getStatusClass(goal.status)}`}>
                    {getStatusText(goal.status)}
                  </span>
                </div>
                <div className="goalProgressPreview">
                  <div className="progressPercent">{progress}%</div>
                  {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                </div>
              </div>

              <div className="progressBarContainer">
                <div className="progressBarFill" style={{ width: `${progress}%` }} />
              </div>

              <div className="goalStatsChekpoint">
                <div className="statRow">
                  <span className="statLabel">Цель</span>
                  <span className="statValue">{formatCurrency(goal.target_amount)} ₽</span>
                </div>
                <div className="statRow">
                  <span className="statLabel">Накоплено</span>
                  <span className="statValue highlight">{formatCurrency(goal.current_amount)} ₽</span>
                </div>
                <div className="statRow">
                  <span className="statLabel">Осталось</span>
                  <span className="statValue">{formatCurrency(goal.target_amount - goal.current_amount)} ₽</span>
                </div>
              </div>

              {forecast && (
                <div className="forecastInfo">
                  <div className="forecastIcon">📈</div>
                  <div className="forecastText">
                    {forecast.months === 0 ? (
                      "Цель достигнута!"
                    ) : (
                      <>
                        Прогноз: <strong>{forecast.months} месяцев</strong>
                        <span className="forecastDate">
                          (до {forecast.date.toLocaleDateString('ru-RU')})
                        </span>
                      </>
                    )}
                  </div>
                </div>
              )}

              {stats.total > 0 && (
                <div className="checkpointsPreview">
                  <div className="checkpointsStats">
                    <span className="checkpointsCount">
                      📌 Контрольных точек: {stats.total}
                    </span>
                    <div className="checkpointsBreakdown">
                      {stats.completed > 0 && <span className="completed">✅ {stats.completed}</span>}
                      {stats.pending > 0 && <span className="pending">⏳ {stats.pending}</span>}
                      {stats.overdue > 0 && <span className="overdue">⚠️ {stats.overdue}</span>}
                    </div>
                  </div>
                </div>
              )}

              {isExpanded && stats.total > 0 && (
                <div className="goalCheckpointsList">
                  <h4>Контрольные точки</h4>
                  {getGoalCheckpoints(goal.goal_id).map(cp => (
                    <div key={cp.checkpoint_id} className="checkpointMiniItem">
                      <div className="checkpointMiniHeader">
                        <span className="checkpointMiniTitle">{cp.title}</span>
                        <span className="checkpointMiniStatus">
                          {cp.status === "completed" ? "✅" : cp.status === "pending" ? "⏳" : "⚠️"}
                        </span>
                      </div>
                      <div className="checkpointMiniDetails">
                        <span>{formatCurrency(cp.target_amount)} ₽</span>
                        {cp.target_date && (
                          <span>{new Date(cp.target_date).toLocaleDateString('ru-RU')}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="goalActions">
                <button className="actionButton" onClick={() => navigate(`/goals/${goal.goal_id}`)}>
                  <Eye size={14} /> Детали цели
                </button>
                <button className="actionButton primary" onClick={() => navigate(`/scenarios/${goal.goal_id}`)}>
                  <BarChart3 size={14} /> Сценарии
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
