import React, { useEffect, useMemo, useState } from "react";
import { AlertCircle, CalendarClock, ChevronRight, Wallet, X } from "lucide-react";
import { Link } from "react-router-dom";
import { getGoals, getPayments } from "../../api/api";
import "./PaymentReminder.css";

const REMINDER_WINDOW_DAYS = 3;
const DISMISS_KEY_PREFIX = "paymentReminderDismissed";

function PaymentReminder() {
  const [reminders, setReminders] = useState([]);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadReminders = async () => {
      try {
        const goals = await getGoals();
        const activeGoals = (goals || []).filter((goal) => {
          const monthly = Number(goal.monthly_contribution || 0);
          return goal.status !== "completed" && monthly > 0;
        });

        const reminderResults = await Promise.all(
          activeGoals.map(async (goal) => {
            const payments = await getPayments(goal.goal_id).catch(() => []);
            return buildGoalReminder(goal, payments || []);
          })
        );

        if (!cancelled) {
          setReminders(reminderResults.filter(Boolean));
        }
      } catch (error) {
        console.error("Ошибка загрузки напоминаний о платежах:", error);
      }
    };

    loadReminders();

    return () => {
      cancelled = true;
    };
  }, []);

  const visibleReminders = useMemo(() => {
    const todayKey = getLocalDateKey(new Date());
    return reminders.filter((reminder) => {
      const dismissed = localStorage.getItem(`${DISMISS_KEY_PREFIX}:${todayKey}:${reminder.goalId}`);
      return dismissed !== "true";
    });
  }, [reminders]);

  if (hidden || visibleReminders.length === 0) return null;

  const primary = visibleReminders[0];
  const extraCount = visibleReminders.length - 1;

  const handleDismiss = () => {
    const todayKey = getLocalDateKey(new Date());
    visibleReminders.forEach((reminder) => {
      localStorage.setItem(`${DISMISS_KEY_PREFIX}:${todayKey}:${reminder.goalId}`, "true");
    });
    setHidden(true);
  };

  return (
    <section className={`paymentReminder ${primary.status}`}>
      <div className="paymentReminderIcon">
        {primary.status === "overdue" ? <AlertCircle size={22} /> : <CalendarClock size={22} />}
      </div>

      <div className="paymentReminderContent">
        <span>{primary.status === "overdue" ? "Срок пополнения прошёл" : "Скоро срок пополнения"}</span>
        <strong>{primary.title}</strong>
        <p>
          {primary.message}. Плановый взнос: {formatCurrency(primary.monthlyContribution)} ₽.
          {extraCount > 0 ? ` Ещё целей к пополнению: ${extraCount}.` : ""}
        </p>
      </div>

      <div className="paymentReminderActions">
        <Link to={`/goals/${primary.goalId}/payments`} className="paymentReminderButton">
          <Wallet size={16} /> Пополнить <ChevronRight size={15} />
        </Link>
        <button type="button" onClick={handleDismiss} className="paymentReminderClose" aria-label="Скрыть напоминание">
          <X size={16} />
        </button>
      </div>
    </section>
  );
}

function buildGoalReminder(goal, payments) {
  const today = startOfDay(new Date());
  const dueDate = getCurrentPeriodDueDate(goal.start_date || goal.created_at, today);
  const previousDueDate = addMonths(dueDate, -1);
  const notifyFrom = addDays(dueDate, -REMINDER_WINDOW_DAYS);
  const graceEnd = addDays(dueDate, 7);

  if (today < notifyFrom) return null;

  const monthlyContribution = Number(goal.monthly_contribution || 0);
  const paidThisPeriod = payments
    .filter((payment) => {
      const paymentDate = startOfDay(new Date(payment.payment_date));
      return paymentDate >= previousDueDate && paymentDate <= graceEnd;
    })
    .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);

  if (paidThisPeriod >= monthlyContribution) return null;

  const daysToDue = diffDays(today, dueDate);
  const status = daysToDue < 0 ? "overdue" : "upcoming";
  const message = status === "overdue"
    ? `Пополнение просрочено на ${Math.abs(daysToDue)} ${pluralDays(Math.abs(daysToDue))}`
    : daysToDue === 0
      ? "Пополнение нужно сделать сегодня"
      : `До срока пополнения осталось ${daysToDue} ${pluralDays(daysToDue)}`;

  return {
    goalId: goal.goal_id,
    title: goal.title,
    dueDate,
    message,
    monthlyContribution,
    status,
  };
}

function getCurrentPeriodDueDate(startDateValue, today) {
  const startDate = startDateValue ? new Date(startDateValue) : today;
  const dueDay = startDate.getDate() || 1;
  let dueDate = createSafeDate(today.getFullYear(), today.getMonth(), dueDay);

  if (today > addDays(dueDate, 7)) {
    dueDate = createSafeDate(today.getFullYear(), today.getMonth() + 1, dueDay);
  }

  return startOfDay(dueDate);
}

function createSafeDate(year, month, day) {
  const lastDay = new Date(year, month + 1, 0).getDate();
  return new Date(year, month, Math.min(day, lastDay));
}

function startOfDay(date) {
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  return normalized;
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return startOfDay(next);
}

function addMonths(date, months) {
  const next = new Date(date);
  const day = next.getDate();
  next.setDate(1);
  next.setMonth(next.getMonth() + months);
  const lastDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
  next.setDate(Math.min(day, lastDay));
  return startOfDay(next);
}

function diffDays(from, to) {
  return Math.round((to - from) / (1000 * 60 * 60 * 24));
}

function pluralDays(value) {
  const lastDigit = value % 10;
  const lastTwo = value % 100;
  if (lastDigit === 1 && lastTwo !== 11) return "день";
  if ([2, 3, 4].includes(lastDigit) && ![12, 13, 14].includes(lastTwo)) return "дня";
  return "дней";
}

function formatCurrency(amount) {
  return new Intl.NumberFormat("ru-RU").format(Number(amount || 0));
}

function getLocalDateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export default PaymentReminder;
