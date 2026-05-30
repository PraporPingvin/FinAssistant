import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  Calendar,
  CreditCard,
  Home,
  LineChart,
  Pencil,
  Sparkles,
  Target,
  Trash2,
  TrendingUp,
  Wallet,
} from "lucide-react";
import Layout from "../../../components/Layout";
import ModernDialog from "../../../components/ModernDialog/ModernDialog";
import { deleteGoal, getGoal } from "../../../api/api";
import "./GoalDetailPage.css";

function getDayWord(days) {
  if (days % 10 === 1 && days % 100 !== 11) return "день";
  if (days % 10 >= 2 && days % 10 <= 4 && (days % 100 < 10 || days % 100 >= 20)) return "дня";
  return "дней";
}

function getMonthWord(months) {
  if (months % 10 === 1 && months % 100 !== 11) return "месяц";
  if (months % 10 >= 2 && months % 10 <= 4 && (months % 100 < 10 || months % 100 >= 20)) return "месяца";
  return "месяцев";
}

function GoalDetailPage() {
  const { goalId } = useParams();
  const navigate = useNavigate();

  const [goal, setGoal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (goalId) loadGoal();
  }, [goalId]);

  const loadGoal = async () => {
    try {
      setLoading(true);
      setError("");
      const data = await getGoal(goalId);
      setGoal(data);
    } catch (error) {
      console.error("Ошибка загрузки цели:", error);
      setError("Не удалось загрузить данные цели");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteGoal = async () => {
    try {
      setDeleting(true);
      await deleteGoal(goalId);
      navigate("/goals");
    } catch (error) {
      console.error("Ошибка удаления цели:", error);
      setError("Не удалось удалить цель");
      setShowDeleteConfirm(false);
    } finally {
      setDeleting(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("ru-RU", {
      style: "currency",
      currency: "RUB",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(Number(amount || 0));
  };

  const formatDate = (dateString) => {
    if (!dateString) return "—";

    try {
      return new Date(dateString).toLocaleDateString("ru-RU", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      });
    } catch {
      return "—";
    }
  };

  const calculations = useMemo(() => {
    if (!goal) {
      return {
        currentAmount: 0,
        targetAmount: 0,
        remainingAmount: 0,
        progress: 0,
        estimatedTime: "—",
      };
    }

    const currentAmount = Number(goal.current_amount || 0);
    const targetAmount = Number(goal.target_amount || 0);
    const monthlyContribution = Number(goal.monthly_contribution || 0);
    const remainingAmount = Math.max(0, targetAmount - currentAmount);
    const progress = targetAmount ? Math.min(100, Math.round((currentAmount / targetAmount) * 100)) : 0;

    let estimatedTime = "—";

    if (goal.deadline_date) {
      const deadline = new Date(goal.deadline_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      deadline.setHours(0, 0, 0, 0);

      const diffDays = Math.ceil((deadline - today) / (1000 * 60 * 60 * 24));

      if (diffDays > 0) {
        if (diffDays < 30) {
          estimatedTime = `${diffDays} ${getDayWord(diffDays)}`;
        } else {
          const months = Math.floor(diffDays / 30);
          const days = diffDays % 30;
          estimatedTime = days === 0
            ? `${months} ${getMonthWord(months)}`
            : `${months} ${getMonthWord(months)} ${days} ${getDayWord(days)}`;
        }
      } else if (diffDays === 0) {
        estimatedTime = "Сегодня";
      } else {
        estimatedTime = "Просрочена";
      }
    } else if (monthlyContribution > 0 && remainingAmount > 0) {
      const monthsNeeded = remainingAmount / monthlyContribution;

      if (monthsNeeded < 1) {
        const daysNeeded = Math.ceil(monthsNeeded * 30);
        estimatedTime = `${daysNeeded} ${getDayWord(daysNeeded)}`;
      } else {
        const fullMonths = Math.floor(monthsNeeded);
        const remainingDays = Math.ceil((monthsNeeded - fullMonths) * 30);
        estimatedTime = remainingDays === 0
          ? `${fullMonths} ${getMonthWord(fullMonths)}`
          : `${fullMonths} ${getMonthWord(fullMonths)} ${remainingDays} ${getDayWord(remainingDays)}`;
      }
    }

    return {
      currentAmount,
      targetAmount,
      remainingAmount,
      progress,
      estimatedTime,
    };
  }, [goal]);

  if (loading) {
    return (
      <Layout>
        <div className="goalDetailLoading">
          <div className="goalDetailSpinner" />
          <p>Загружаем данные цели...</p>
        </div>
      </Layout>
    );
  }

  if (error || !goal) {
    return (
      <Layout>
        <div className="goalDetailErrorState">
          <div className="goalDetailErrorCard">
            <h2>Ошибка загрузки</h2>
            <p>{error || "Цель не найдена"}</p>
            <button onClick={() => navigate("/goals")} className="backButton">
              Вернуться к целям
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  const statusLabel = goal.status === "active" ? "Активна" : goal.status === "completed" ? "Завершена" : "На паузе";

  return (
    <Layout>
      <div className="goalDetailPage">
        <div className="goalDetailBreadcrumb">
          <Link to="/">
            <Home size={16} />
            Главная
          </Link>
          <span>/</span>
          <Link to="/goals">
            <Target size={16} />
            Цели
          </Link>
          <span>/</span>
          <span className="current">{goal.title}</span>
        </div>

        <section className="goalHero">
          <div className="goalHeroMain">
            <div className="goalHeroCopy">
              <span className={`statusBadge status-${goal.status}`}>{statusLabel}</span>
              <h1 className="goalTitle">{goal.title}</h1>
              {goal.description && <p className="goalDescription">{goal.description}</p>}
            </div>

            <div className="heroActions">
              <Link to={`/goals/${goalId}/edit`} className="heroButton primaryButton">
                <Pencil size={18} />
                Редактировать
              </Link>
              <button onClick={() => setShowDeleteConfirm(true)} className="heroButton dangerButton">
                <Trash2 size={18} />
                Удалить
              </button>
            </div>
          </div>

          <div className="goalHeroDashboard">
            <div className="goalProgressDonut" style={{ "--progress": `${calculations.progress}%` }}>
              <div>
                <strong>{calculations.progress}%</strong>
                <span>прогресс</span>
              </div>
            </div>
            <div className="goalHeroAmounts">
              <span>Накоплено</span>
              <strong>{formatCurrency(calculations.currentAmount)}</strong>
              <small>из {formatCurrency(calculations.targetAmount)}</small>
            </div>
          </div>
        </section>

        <section className="progressCard">
          <div className="progressHeader">
            <div>
              <span className="sectionKicker">Финансовый маршрут</span>
              <h2>Прогресс накоплений</h2>
            </div>
            <strong>{calculations.progress}%</strong>
          </div>

          <div className="goalDetailProgressTrack">
            <div className="goalDetailProgressFill" style={{ width: `${calculations.progress}%` }} />
          </div>

          <div className="progressStats">
            <div className="goalDetailStatCard">
              <span>Осталось накопить</span>
              <strong>{formatCurrency(calculations.remainingAmount)}</strong>
            </div>
            <div className="goalDetailStatCard">
              <span>Ежемесячный взнос</span>
              <strong>{formatCurrency(goal.monthly_contribution)}</strong>
            </div>
            <div className="goalDetailStatCard">
              <span>Примерный срок</span>
              <strong>{calculations.estimatedTime}</strong>
            </div>
          </div>
        </section>

        <section className="infoGridGoalDetail">
          <div className="infoCardGoalDetail">
            <Wallet size={22} />
            <div>
              <span>Стартовая сумма</span>
              <strong>{formatCurrency(goal.initial_amount || 0)}</strong>
            </div>
          </div>
          <div className="infoCardGoalDetail">
            <Calendar size={22} />
            <div>
              <span>Дата начала</span>
              <strong>{formatDate(goal.start_date)}</strong>
            </div>
          </div>
          <div className="infoCardGoalDetail">
            <Target size={22} />
            <div>
              <span>Дедлайн</span>
              <strong>{goal.deadline_date ? formatDate(goal.deadline_date) : "Не установлен"}</strong>
            </div>
          </div>
          <div className="infoCardGoalDetail">
            <TrendingUp size={22} />
            <div>
              <span>Статус</span>
              <strong>{goal.status === "active" ? "В процессе" : statusLabel}</strong>
            </div>
          </div>
        </section>

        <section className="actionSection">
          <Link to={`/goals/${goalId}/payments`} className="actionCard">
            <CreditCard size={24} />
            <div>
              <h3>Платежи</h3>
              <p>Просмотр и добавление платежей по этой цели.</p>
            </div>
          </Link>
          <Link to={`/scenarios/${goalId}`} className="actionCard">
            <LineChart size={24} />
            <div>
              <h3>Сценарии</h3>
              <p>Сравните варианты накоплений и темпы достижения.</p>
            </div>
          </Link>
          <Link to={`/forecast/${goalId}`} className="actionCard">
            <Sparkles size={24} />
            <div>
              <h3>Прогноз</h3>
              <p>Оцените дату достижения цели и финансовую траекторию.</p>
            </div>
          </Link>
        </section>

        <ModernDialog
          open={showDeleteConfirm}
          variant="danger"
          eyebrow="Важное действие"
          title="Удалить цель?"
          description="Это действие нельзя отменить. Связанные данные цели могут стать недоступны."
          cancelText="Отмена"
          confirmText="Удалить"
          loading={deleting}
          onCancel={() => setShowDeleteConfirm(false)}
          onConfirm={handleDeleteGoal}
        />
      </div>
    </Layout>
  );
}

export default GoalDetailPage;
