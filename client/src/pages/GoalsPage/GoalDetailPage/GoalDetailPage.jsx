import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  Calendar,
  CalendarClock,
  ChevronRight,
  Flag,
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
import { deleteGoal, getCheckpointsByGoal, getGoal, getPayments } from "../../../api/api";
import { buildPaymentSchedule, getPaymentStatusLabel } from "../../../utils/paymentSchedule";
import { calculateScenarioMetrics } from "../../../utils/scenarioCalculations";
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

function addCalendarMonths(date, monthsToAdd) {
  const next = new Date(date);
  const day = next.getDate();
  next.setDate(1);
  next.setMonth(next.getMonth() + monthsToAdd);
  const lastDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
  next.setDate(Math.min(day, lastDay));
  return next;
}

function formatRemainingTerm(monthsNeeded) {
  if (monthsNeeded <= 0) return "Цель достигнута";

  const years = Math.floor(monthsNeeded / 12);
  const months = monthsNeeded % 12;
  const parts = [];

  if (years > 0) parts.push(`${years} ${years % 10 === 1 && years % 100 !== 11 ? "год" : years % 10 >= 2 && years % 10 <= 4 && (years % 100 < 10 || years % 100 >= 20) ? "года" : "лет"}`);
  if (months > 0) parts.push(`${months} ${getMonthWord(months)}`);

  return parts.join(" ") || "Меньше месяца";
}

function GoalDetailPage() {
  const { goalId } = useParams();
  const navigate = useNavigate();

  const [goal, setGoal] = useState(null);
  const [payments, setPayments] = useState([]);
  const [checkpoints, setCheckpoints] = useState([]);
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
      const [data, paymentsData, checkpointsData] = await Promise.all([
        getGoal(goalId),
        getPayments(goalId).catch(() => []),
        getCheckpointsByGoal(goalId).catch(() => []),
      ]);
      setGoal(data);
      setPayments(paymentsData || []);
      setCheckpoints(checkpointsData || []);
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

    const plan = calculateScenarioMetrics({
      goal,
      payments,
      scenario: {
        monthly_contribution: goal.monthly_contribution,
        expected_return: 0,
        inflation_rate: 0,
      },
    });
    const currentAmount = plan.current;
    const targetAmount = plan.target;
    const remainingAmount = plan.remaining;
    const progress = targetAmount ? Math.min(100, Math.round((currentAmount / targetAmount) * 100)) : 0;

    let estimatedTime = "—";

    if (remainingAmount <= 0) {
      estimatedTime = "Цель достигнута";
    } else if (Number.isFinite(plan.monthsToGoal)) {
      const monthsNeeded = plan.monthsToGoal;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const finishDate = addCalendarMonths(today, monthsNeeded);
      const diffDays = Math.round((finishDate - today) / (1000 * 60 * 60 * 24));

      estimatedTime = monthsNeeded < 1
        ? `${diffDays} ${getDayWord(diffDays)}`
        : formatRemainingTerm(monthsNeeded);
    }

    return {
      currentAmount,
      targetAmount,
      remainingAmount,
      progress,
      estimatedTime,
    };
  }, [goal, payments]);

  const paymentSchedule = useMemo(
    () => buildPaymentSchedule(goal, payments),
    [goal, payments]
  );

  const checkpointTimeline = useMemo(() => {
    if (!goal) return [];
    const target = Number(goal.target_amount || 0);
    const current = calculations.currentAmount;
    return [...checkpoints]
      .sort((a, b) => Number(a.target_amount || 0) - Number(b.target_amount || 0))
      .map((checkpoint) => {
        const amount = Number(checkpoint.target_amount || 0);
        const achieved = checkpoint.status === "completed" || current >= amount;
        return {
          ...checkpoint,
          amount,
          achieved,
          remaining: Math.max(0, amount - current),
          position: target > 0 ? Math.min(100, Math.max(2, (amount / target) * 100)) : 0,
        };
      });
  }, [goal, checkpoints, calculations.currentAmount]);

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
          <div className="goalMetaInline">
            <div><span>Старт</span><strong>{formatCurrency(goal.initial_amount || 0)}</strong></div>
            <div><span>Начало</span><strong>{formatDate(goal.start_date)}</strong></div>
            <div><span>Дедлайн</span><strong>{goal.deadline_date ? formatDate(goal.deadline_date) : "Не установлен"}</strong></div>
            <div><span>Статус</span><strong>{goal.status === "active" ? "В процессе" : statusLabel}</strong></div>
          </div>
        </section>

        <section className="goalCheckpointTimeline">
          <div className="goalCheckpointHeader">
            <div>
              <span className="sectionKicker">Этапы маршрута</span>
              <h2>Контрольные точки цели</h2>
              <p>Шкала показывает, какие промежуточные суммы нужно накопить и к каким датам.</p>
            </div>
            <Link to={`/checkpoints?create=1&goalId=${goalId}`} className="goalCheckpointCreate">
              <Flag size={16} /> Добавить точку
            </Link>
          </div>

          {checkpointTimeline.length > 0 ? (
            <>
              <div className="goalCheckpointScale">
                <div className="goalCheckpointScaleFill" style={{ width: `${calculations.progress}%` }} />
                {checkpointTimeline.map((checkpoint) => (
                  <div
                    key={checkpoint.checkpoint_id}
                    className={`goalCheckpointMarker ${checkpoint.achieved ? "achieved" : ""}`}
                    style={{ left: `${checkpoint.position}%` }}
                  >
                    <span />
                    <div>
                      <strong>{checkpoint.title}</strong>
                      <small>{formatCurrency(checkpoint.amount)}</small>
                    </div>
                  </div>
                ))}
              </div>

              <div className="goalCheckpointList">
                {checkpointTimeline.map((checkpoint) => (
                  <article key={checkpoint.checkpoint_id} className={checkpoint.achieved ? "achieved" : ""}>
                    <Flag size={18} />
                    <div>
                      <strong>{checkpoint.title}</strong>
                      <span>{checkpoint.target_date ? `Срок: ${formatDate(checkpoint.target_date)}` : "Срок не указан"}</span>
                    </div>
                    <div>
                      <b>{checkpoint.achieved ? "Достигнуто" : `Осталось ${formatCurrency(checkpoint.remaining)}`}</b>
                      <small>{formatCurrency(checkpoint.amount)}</small>
                    </div>
                  </article>
                ))}
              </div>
            </>
          ) : (
            <div className="goalCheckpointEmpty">
              <Flag size={30} />
              <div>
                <strong>Контрольных точек пока нет</strong>
                <span>Например: накопить первые 50% суммы к выбранной дате.</span>
              </div>
              <Link to={`/checkpoints?create=1&goalId=${goalId}`}>Создать контрольную точку</Link>
            </div>
          )}
        </section>

        {paymentSchedule && (
          <section className={`goalNextPaymentCard ${paymentSchedule.status}`}>
            <div className="goalNextPaymentIcon">
              <CalendarClock size={24} />
            </div>
            <div className="goalNextPaymentContent">
              <span>{getPaymentStatusLabel(paymentSchedule.status)}</span>
              <h2>Следующий платеж: {paymentSchedule.dueDateLabel}</h2>
              <p>
                {paymentSchedule.isCurrentPeriodCovered
                  ? `Текущий период уже закрыт. Следующий плановый взнос: ${formatCurrency(paymentSchedule.amountDue)}.`
                  : `${paymentSchedule.message}. Осталось внести за текущий период: ${formatCurrency(paymentSchedule.amountDue)}.`}
              </p>
            </div>
            <Link to={`/goals/${goalId}/payments/new`} className="goalNextPaymentButton">
              <CreditCard size={16} />
              Внести платеж
            </Link>
          </section>
        )}

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
              <span className="actionCardLink">Открыть платежи <ChevronRight size={17} /></span>
            </div>
          </Link>
          <Link to={`/scenarios/${goalId}`} className="actionCard">
            <LineChart size={24} />
            <div>
              <h3>Сценарии</h3>
              <p>Сравните варианты накоплений и темпы достижения.</p>
              <span className="actionCardLink">Открыть сценарии <ChevronRight size={17} /></span>
            </div>
          </Link>
          <Link to={`/forecast/${goalId}`} className="actionCard">
            <Sparkles size={24} />
            <div>
              <h3>Прогноз</h3>
              <p>Оцените дату достижения цели и финансовую траекторию.</p>
              <span className="actionCardLink">Открыть прогноз <ChevronRight size={17} /></span>
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
