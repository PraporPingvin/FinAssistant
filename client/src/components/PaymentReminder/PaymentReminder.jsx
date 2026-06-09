import React, { useEffect, useMemo, useState } from "react";
import { AlertCircle, CalendarClock, ChevronRight, Wallet, X } from "lucide-react";
import { Link } from "react-router-dom";
import { getGoals, getPayments } from "../../api/api";
import { buildPaymentSchedule, getPaymentStatusLabel } from "../../utils/paymentSchedule";
import "./PaymentReminder.css";

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
          setReminders(reminderResults.filter((reminder) => reminder?.shouldNotify));
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
        <span>{getPaymentStatusLabel(primary.status)}</span>
        <strong>{primary.title}</strong>
        <p>
          {primary.isCurrentPeriodCovered
            ? `Текущий период закрыт. Следующий платеж: ${primary.dueDateLabel}.`
            : `${primary.message}. До планового взноса осталось: ${formatCurrency(primary.amountDue)} ₽.`}
          {extraCount > 0 ? ` Ещё целей к пополнению: ${extraCount}.` : ""}
        </p>
      </div>

      <div className="paymentReminderActions">
        <Link to={`/goals/${primary.goalId}/payments/new`} className="paymentReminderButton">
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
  return buildPaymentSchedule(goal, payments);
}

function formatCurrency(amount) {
  return new Intl.NumberFormat("ru-RU").format(Number(amount || 0));
}

function getLocalDateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export default PaymentReminder;
