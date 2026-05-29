import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  AlertCircle,
  CheckCircle,
  Clock3,
  PieChart,
  Plus,
  Sparkles,
  Target,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { getGoals } from "../../api/api";
import Layout from "../../components/Layout";
import GoalCard from "../../components/Goal/GoalCard/GoalCard";
import "./GoalsPage.css";

function GoalsPage() {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadGoals();
  }, []);

  const loadGoals = async () => {
    try {
      setLoading(true);
      const data = await getGoals();
      setGoals(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Ошибка загрузки целей:", err);
      setError(err.message || "Не удалось загрузить цели");
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    const num = parseFloat(amount) || 0;
    return new Intl.NumberFormat("ru-RU").format(num);
  };

  const metrics = goals.reduce(
    (acc, goal) => {
      const target = parseFloat(goal.target_amount) || 0;
      const current = parseFloat(goal.current_amount) || 0;
      const monthly = parseFloat(goal.monthly_contribution) || 0;

      acc.totalTarget += target;
      acc.totalSaved += current;
      acc.monthlyFlow += monthly;
      acc.active += goal.status === "active" ? 1 : 0;
      acc.completed += goal.status === "completed" ? 1 : 0;
      acc.paused += goal.status === "paused" ? 1 : 0;

      return acc;
    },
    {
      active: 0,
      completed: 0,
      monthlyFlow: 0,
      paused: 0,
      totalSaved: 0,
      totalTarget: 0,
    }
  );

  const overallProgress = metrics.totalTarget
    ? Math.min(100, Math.round((metrics.totalSaved / metrics.totalTarget) * 100))
    : 0;

  const topGoals = [...goals]
    .map((goal) => {
      const target = parseFloat(goal.target_amount) || 1;
      const current = parseFloat(goal.current_amount) || 0;
      return {
        ...goal,
        progress: Math.min(100, Math.round((current / target) * 100)),
      };
    })
    .sort((a, b) => b.progress - a.progress)
    .slice(0, 4);

  if (loading) {
    return (
      <Layout>
        <div className="goalsLoadingContainer">
          <div className="goalsLoadingSpinner" />
          <p className="loadingText">Загружаем ваши цели...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="goalsPage">
        <section className="goalsHero">
          <div className="goalsHeroContent">
            <div className="heroBadge">
              <Sparkles size={16} />
              Финансовое планирование
            </div>
            <h1 className="goalsTitle">Мои цели</h1>
            <p className="goalsSubtitle">
              Отслеживайте накопления, анализируйте прогресс и управляйте финансовыми целями как портфелем.
            </p>
          </div>

          <div className="goalsHeroPanel">
            <div className="goalsDonut" style={{ "--goal-progress": `${overallProgress}%` }}>
              <div>
                <strong>{overallProgress}%</strong>
                <span>общий прогресс</span>
              </div>
            </div>
            <div className="goalsHeroNumbers">
              <span>Накоплено</span>
              <strong>{formatCurrency(metrics.totalSaved)} ₽</strong>
              <small>из {formatCurrency(metrics.totalTarget)} ₽</small>
            </div>
          </div>

          <Link to="/goals/new" className="createGoalButton">
            <Plus size={18} />
            Новая цель
          </Link>
        </section>

        {error && (
          <div className="errorMessage">
            <AlertCircle size={18} />
            {error}
          </div>
        )}

        {goals.length === 0 && (
          <div className="goalsEmptyState">
            <div className="emptyIcon">
              <Target size={48} />
            </div>
            <h2>У вас пока нет целей</h2>
            <p>
              Создайте первую финансовую цель, и страница соберёт прогресс, темп и приоритеты в одном месте.
            </p>
            <Link to="/goals/new" className="emptyButton">
              <Plus size={18} />
              Создать первую цель
            </Link>
          </div>
        )}

        {goals.length > 0 && (
          <>
            <section className="goalsStatsGrid" aria-label="Сводка целей">
              <article className="goalsStatCard">
                <div className="goalsStatIcon"><Target size={22} /></div>
                <div>
                  <strong>{goals.length}</strong>
                  <span>Всего целей</span>
                </div>
              </article>
              <article className="goalsStatCard">
                <div className="goalsStatIcon blue"><Activity size={22} /></div>
                <div>
                  <strong>{metrics.active}</strong>
                  <span>Активно</span>
                </div>
              </article>
              <article className="goalsStatCard">
                <div className="goalsStatIcon green"><CheckCircle size={22} /></div>
                <div>
                  <strong>{metrics.completed}</strong>
                  <span>Завершено</span>
                </div>
              </article>
              <article className="goalsStatCard">
                <div className="goalsStatIcon amber"><Wallet size={22} /></div>
                <div>
                  <strong>{formatCurrency(metrics.monthlyFlow)} ₽</strong>
                  <span>Ежемесячный темп</span>
                </div>
              </article>
            </section>

            <section className="goalsAnalytics">
              <article className="goalsChartCard wide">
                <div className="goalsSectionHeader">
                  <div>
                    <span>Портфель целей</span>
                    <h2>Финансовый прогресс</h2>
                  </div>
                  <TrendingUp size={24} />
                </div>
                <div className="goalsProgressTrack">
                  <div className="goalsProgressFill" style={{ width: `${overallProgress}%` }} />
                </div>
                <div className="goalsProgressMeta">
                  <span>{formatCurrency(metrics.totalSaved)} ₽ собрано</span>
                  <span>{formatCurrency(Math.max(metrics.totalTarget - metrics.totalSaved, 0))} ₽ осталось</span>
                </div>
              </article>

              <article className="goalsChartCard">
                <div className="goalsSectionHeader">
                  <div>
                    <span>Статусы</span>
                    <h2>Распределение</h2>
                  </div>
                  <PieChart size={24} />
                </div>
                <div className="statusBars">
                  <div style={{ "--bar": `${goals.length ? (metrics.active / goals.length) * 100 : 0}%` }}>
                    <span>Активные</span>
                    <strong>{metrics.active}</strong>
                  </div>
                  <div style={{ "--bar": `${goals.length ? (metrics.completed / goals.length) * 100 : 0}%` }}>
                    <span>Завершённые</span>
                    <strong>{metrics.completed}</strong>
                  </div>
                  <div style={{ "--bar": `${goals.length ? (metrics.paused / goals.length) * 100 : 0}%` }}>
                    <span>На паузе</span>
                    <strong>{metrics.paused}</strong>
                  </div>
                </div>
              </article>

              <article className="goalsChartCard">
                <div className="goalsSectionHeader">
                  <div>
                    <span>Фокус</span>
                    <h2>Ближе всего</h2>
                  </div>
                  <Clock3 size={24} />
                </div>
                <div className="topGoalsList">
                  {topGoals.map((goal) => (
                    <div key={goal.goal_id} className="topGoalItem">
                      <span>{goal.title}</span>
                      <strong>{goal.progress}%</strong>
                    </div>
                  ))}
                </div>
              </article>
            </section>

            <section className="goalsListSection">
              <div className="goalsSectionHeader">
                <div>
                  <span>Рабочая зона</span>
                  <h2>Все цели</h2>
                </div>
              </div>
              <div className="goalsGrid">
                {goals.map((goal) => (
                  <GoalCard key={goal.goal_id} goal={goal} />
                ))}
              </div>
            </section>
          </>
        )}
      </div>
    </Layout>
  );
}

export default GoalsPage;
