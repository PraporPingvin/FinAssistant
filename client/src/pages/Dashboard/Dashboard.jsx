import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertCircle,
  ArrowUpRight,
  Bell,
  CalendarDays,
  CheckCircle,
  Clock3,
  PieChart,
  Plus,
  RefreshCw,
  Sparkles,
  Target,
  TrendingUp,
  Wallet,
} from "lucide-react";
import Layout from "../../components/Layout";
import { getCheckpoints, getGoals } from "../../api/api";
import GoalCard from "../../components/Goal/GoalCard/GoalCard";
import { useAuth } from "../../context/AuthContext";
import { calculateScenarioMetrics } from "../../utils/scenarioCalculations";
import "./Dashboard.css";

function Dashboard() {
  const [goals, setGoals] = useState([]);
  const [checkpoints, setCheckpoints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  const { user, isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated && user) {
      loadGoals();
    }
  }, [isAuthenticated, user]);

  const calculateTotalProgress = (goalsList) => {
    if (!goalsList || goalsList.length === 0) return 0;

    const totals = goalsList.reduce(
      (acc, goal) => {
        acc.target += parseFloat(goal.target_amount) || 0;
        acc.current += parseFloat(goal.current_amount) || 0;
        return acc;
      },
      { target: 0, current: 0 }
    );

    if (totals.target === 0) return 0;

    const progress = Math.round((totals.current / totals.target) * 100);
    return Math.min(Math.max(progress, 0), 100);
  };

  const loadGoals = async (isRefresh = false) => {
    if (!user) return;

    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const [data, checkpointsData] = await Promise.all([
        getGoals(user.id),
        getCheckpoints().catch(() => []),
      ]);

      if (data && Array.isArray(data)) {
        setGoals(data);
        setCheckpoints(checkpointsData || []);
        setError(null);
        setLastUpdate(new Date());
      } else {
        setGoals([]);
      }
    } catch (error) {
      console.error("Ошибка загрузки:", error);
      setError(`Ошибка: ${error.message}`);
      setGoals([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const formatCurrency = (amount) => {
    const num = parseFloat(amount) || 0;
    return new Intl.NumberFormat("ru-RU").format(num);
  };

  const metrics = useMemo(() => {
    const totalSaved = goals.reduce((sum, g) => sum + (parseFloat(g.current_amount) || 0), 0);
    const totalTarget = goals.reduce((sum, g) => sum + (parseFloat(g.target_amount) || 0), 0);
    const monthlyFlow = goals.reduce((sum, g) => sum + (parseFloat(g.monthly_contribution) || 0), 0);
    const activeGoals = goals.filter((g) => g.status === "active").length;
    const completedGoals = goals.filter((g) => g.status === "completed").length;
    const totalProgress = calculateTotalProgress(goals);
    const remaining = Math.max(totalTarget - totalSaved, 0);
    const monthsToFinish = monthlyFlow > 0 ? Math.ceil(remaining / monthlyFlow) : null;

    return {
      activeGoals,
      completedGoals,
      monthlyFlow,
      monthsToFinish,
      remaining,
      totalProgress,
      totalSaved,
      totalTarget,
    };
  }, [goals]);

  const topGoals = useMemo(() => {
    return [...goals]
      .sort((a, b) => {
        const aTarget = parseFloat(a.target_amount) || 1;
        const bTarget = parseFloat(b.target_amount) || 1;
        const aProgress = (parseFloat(a.current_amount) || 0) / aTarget;
        const bProgress = (parseFloat(b.current_amount) || 0) / bTarget;
        return bProgress - aProgress;
      })
      .slice(0, 3);
  }, [goals]);

  const baselineGoalForecast = useMemo(() => {
    const activeForecasts = goals
      .filter((item) => item.status === "active")
      .map((item) => {
        const plan = calculateScenarioMetrics({
          goal: item,
          scenario: {
            monthly_contribution: item.monthly_contribution,
            expected_return: 0,
            inflation_rate: 0,
          },
        });
        const { target, current, monthly, remaining } = plan;
        const months = Number.isFinite(plan.monthsToGoal) ? plan.monthsToGoal : null;
        const date = months !== null ? new Date() : null;
        if (date) date.setMonth(date.getMonth() + months);

        return {
          ...item,
          current,
          date,
          monthly,
          months,
          remaining,
          target,
          progress: target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0,
        };
      });

    return activeForecasts.sort((a, b) => {
      if (a.months === null && b.months === null) return b.progress - a.progress;
      if (a.months === null) return 1;
      if (b.months === null) return -1;
      return a.months - b.months;
    })[0] || null;
  }, [goals]);

  const checkpointOverview = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const plans = checkpoints.map((checkpoint) => {
      const goal = goals.find(item => item.goal_id === checkpoint.goal_id);
      const target = Number(checkpoint.target_amount || 0);
      const current = Number(goal?.current_amount || 0);
      const monthly = Number(goal?.monthly_contribution || 0);
      const remaining = Math.max(0, target - current);
      const months = remaining > 0 && monthly > 0 ? Math.ceil(remaining / monthly) : 0;
      const targetDate = checkpoint.target_date ? new Date(checkpoint.target_date) : null;
      if (targetDate) targetDate.setHours(0, 0, 0, 0);
      const forecastDate = months > 0 ? new Date(today) : null;
      if (forecastDate) forecastDate.setMonth(forecastDate.getMonth() + months);
      const days = targetDate ? Math.ceil((targetDate - today) / 86400000) : null;
      let status = "noDeadline";
      if (checkpoint.status === "completed" || remaining <= 0) status = "achieved";
      else if (days !== null && days < 0) status = "overdue";
      else if (!monthly || (targetDate && forecastDate > targetDate)) status = "risk";
      else if (targetDate) status = "onTrack";
      return {
        checkpoint,
        goal,
        remaining,
        progress: target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0,
        days,
        status,
      };
    });
    const active = plans.filter(item => item.status !== "achieved");
    const next = [...active].sort((a, b) => {
      if (a.days === null) return 1;
      if (b.days === null) return -1;
      return a.days - b.days;
    })[0] || null;
    return {
      next,
      alerts: active.filter(item => ["risk", "overdue"].includes(item.status)).length,
    };
  }, [checkpoints, goals]);

  const checkpointStatusText = (status) => ({
    achieved: "Достигнуто",
    onTrack: "Успеваем",
    risk: "Есть риск",
    overdue: "Срок прошел",
    noDeadline: "Без срока",
  }[status] || "");

  if (!isAuthenticated || !user) {
    return null;
  }

  const displayName = user.first_name || user.email || "пользователь";

  return (
    <Layout>
      <div className="dashboardPage">
        <section className="dashboardHero">
          <div className="heroCopy">
            <div className="eyebrow">
              <Sparkles size={16} />
              Персональный финансовый центр
            </div>
            <h1 className="dashboardTitle">Дашборд, который держит цели в фокусе</h1>
            <p className="dashboardSubtitle">
              Добро пожаловать, {displayName}. Здесь видно общий прогресс, темп накоплений и ближайшие финансовые приоритеты.
            </p>
            <div className="heroActions">
              <Link to="/goals/new" className="primaryAction">
                <Plus size={18} />
                Новая цель
              </Link>
              <Link to="/forecast" className="secondaryAction">
                Открыть прогноз
                <ArrowUpRight size={17} />
              </Link>
            </div>
          </div>

          <div className="heroPanel" aria-label="Общий прогресс целей">
            <div className="orbitalProgress" style={{ "--progress": `${metrics.totalProgress}%` }}>
              <div className="orbitalProgressInner">
                <strong>{metrics.totalProgress}%</strong>
                <span>выполнено</span>
              </div>
            </div>
            <div className="heroPanelStats">
              <span>Накоплено</span>
              <strong>{formatCurrency(metrics.totalSaved)} ₽</strong>
              <small>из {formatCurrency(metrics.totalTarget)} ₽</small>
            </div>
          </div>
        </section>

        {error && (
          <div className="errorCard">
            <AlertCircle size={20} />
            <div>
              <strong>Ошибка:</strong> {error}
            </div>
          </div>
        )}

        {checkpointOverview.next && (
          <section className={`dashboardCheckpoint checkpoint-${checkpointOverview.next.status}`}>
            <div className="dashboardCheckpointIcon"><Bell size={24} /></div>
            <div className="dashboardCheckpointMain">
              <span>Ближайшая контрольная точка</span>
              <h2>{checkpointOverview.next.checkpoint.title}</h2>
              <p>
                {checkpointStatusText(checkpointOverview.next.status)} · {checkpointOverview.next.days === null
                  ? "срок не указан"
                  : checkpointOverview.next.days < 0
                    ? `срок прошел ${Math.abs(checkpointOverview.next.days)} дн. назад`
                    : `до срока ${checkpointOverview.next.days} дн.`}
              </p>
              <div className="dashboardCheckpointTrack"><div style={{ width: `${checkpointOverview.next.progress}%` }} /></div>
            </div>
            <div className="dashboardCheckpointAmount">
              <span>Осталось</span>
              <strong>{formatCurrency(checkpointOverview.next.remaining)} ₽</strong>
              <small>{checkpointOverview.next.progress}% выполнено</small>
            </div>
            <div className="dashboardCheckpointActions">
              <Link to={`/goals/${checkpointOverview.next.checkpoint.goal_id}/payments/new`}>Внести платеж</Link>
              <Link to="/checkpoints">Все точки{checkpointOverview.alerts > 0 ? ` · ${checkpointOverview.alerts} требуют внимания` : ""}</Link>
            </div>
          </section>
        )}

        {goals.length > 0 && !checkpointOverview.next && (
          <section className="dashboardCheckpointExample">
            <div><Target size={26} /></div>
            <div>
              <span>Пример контрольной точки</span>
              <h2>Накопить первые 50% цели</h2>
              <p>Контрольная точка покажет, сколько осталось, успеваете ли вы к сроку и когда нужно внести платеж.</p>
            </div>
            <Link to="/checkpoints?create=1"><Plus size={16} /> Создать точку</Link>
          </section>
        )}

        <section className="statsGrid" aria-label="Ключевые показатели">
          <article className="dashboardStatCard accentCard">
            <div className="dashboardStatIcon">
              <Target size={24} />
            </div>
            <div>
              <div className="dashboardStatNumber">{goals.length}</div>
              <div className="dashboardStatLabel">Всего целей</div>
            </div>
          </article>
          <article className="dashboardStatCard">
            <div className="dashboardStatIcon blue">
              <TrendingUp size={24} />
            </div>
            <div>
              <div className="dashboardStatNumber">{metrics.activeGoals}</div>
              <div className="dashboardStatLabel">Активно сейчас</div>
            </div>
          </article>
          <article className="dashboardStatCard">
            <div className="dashboardStatIcon green">
              <CheckCircle size={24} />
            </div>
            <div>
              <div className="dashboardStatNumber">{metrics.completedGoals}</div>
              <div className="dashboardStatLabel">Завершено</div>
            </div>
          </article>
          <article className="dashboardStatCard">
            <div className="dashboardStatIcon amber">
              <Wallet size={24} />
            </div>
            <div>
              <div className="dashboardStatNumber">{formatCurrency(metrics.monthlyFlow)} ₽</div>
              <div className="dashboardStatLabel">Ежемесячный темп</div>
            </div>
          </article>
        </section>

        {goals.length > 0 && (
          <section className="insightGrid">
            <article className="progressSection">
              <div className="sectionHeader">
                <div>
                  <span className="sectionKicker">Портфель целей</span>
                  <h2>Общий прогресс</h2>
                </div>
                <span className="progressPercent">{metrics.totalProgress}%</span>
              </div>
              <div className="dashboardProgressTrack">
                <div className="dashboardProgressFill" style={{ width: `${metrics.totalProgress}%` }} />
              </div>
              <div className="progressDetails">
                <span>{formatCurrency(metrics.totalSaved)} ₽ собрано</span>
                <span>{formatCurrency(metrics.remaining)} ₽ осталось</span>
              </div>
              <div className="forecastStrip">
                <Clock3 size={18} />
                <span>
                  {metrics.monthsToFinish
                    ? `Ориентир до финиша: ${metrics.monthsToFinish} мес. при текущем темпе`
                    : "Добавьте ежемесячный взнос, чтобы увидеть прогноз финиша"}
                </span>
              </div>
              {baselineGoalForecast && (
                <Link to={`/forecast/${baselineGoalForecast.goal_id}`} className="baselineForecastCard">
                  <div>
                    <span className="baselineLabel">Базовый прогноз без сценариев</span>
                    <strong>{baselineGoalForecast.title}</strong>
                    <small>
                      {formatCurrency(baselineGoalForecast.current)} ₽ из {formatCurrency(baselineGoalForecast.target)} ₽
                    </small>
                  </div>
                  <div className="baselineForecastMeta">
                    <b>{baselineGoalForecast.months !== null ? `${baselineGoalForecast.months} мес.` : "Нет взноса"}</b>
                    <span>
                      <CalendarDays size={14} />
                      {baselineGoalForecast.date
                        ? baselineGoalForecast.date.toLocaleDateString("ru-RU", { month: "long", year: "numeric" })
                        : "укажите взнос"}
                    </span>
                  </div>
                </Link>
              )}
            </article>

            <article className="priorityPanel">
              <div className="sectionHeader compact">
                <div>
                  <span className="sectionKicker">Приоритеты</span>
                  <h2>Ближе всего к цели</h2>
                </div>
                <PieChart size={24} />
              </div>
              <div className="priorityList">
                {topGoals.map((goal) => {
                  const target = parseFloat(goal.target_amount) || 1;
                  const current = parseFloat(goal.current_amount) || 0;
                  const progress = Math.min(Math.round((current / target) * 100), 100);

                  return (
                    <div className="priorityItem" key={goal.goal_id}>
                      <div>
                        <strong>{goal.title}</strong>
                        <span>{formatCurrency(current)} ₽ из {formatCurrency(target)} ₽</span>
                      </div>
                      <b>{progress}%</b>
                    </div>
                  );
                })}
              </div>
            </article>
          </section>
        )}

        {loading ? (
          <div className="loadingContainer">
            <div className="loadingSpinner" />
            <p>Загружаем ваши цели...</p>
          </div>
        ) : goals.length === 0 ? (
          <div className="emptyState">
            <Target size={56} />
            <h2>Начните свой финансовый маршрут</h2>
            <p>Создайте первую цель, и дашборд соберёт прогресс, темп накоплений и прогноз в одном месте.</p>
            <Link to="/goals/new" className="createButton">
              <Plus size={18} />
              Создать первую цель
            </Link>
          </div>
        ) : (
          <section className="goalsSection">
            <div className="sectionHeader">
              <div>
                <span className="sectionKicker">Рабочая зона</span>
                <h2>Ваши цели</h2>
              </div>
              <button onClick={() => loadGoals(true)} className="refreshButton" disabled={refreshing}>
                <RefreshCw size={16} className={refreshing ? "spinning" : ""} />
                {refreshing ? "Обновляем..." : "Обновить"}
              </button>
            </div>
            <div className="goalsGrid">
              {goals.map((goal) => (
                <GoalCard key={goal.goal_id} goal={goal} />
              ))}
            </div>
          </section>
        )}

        <div className="lastUpdate">Данные обновлены в {formatTime(lastUpdate)}</div>
      </div>
    </Layout>
  );
}

export default Dashboard;
