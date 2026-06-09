export const REMINDER_WINDOW_DAYS = 3;

export function buildPaymentSchedule(goal, payments = [], todayValue = new Date()) {
  const monthlyContribution = Number(goal?.monthly_contribution || 0);

  if (!goal || goal.status === "completed" || monthlyContribution <= 0) {
    return null;
  }

  const today = startOfDay(todayValue);
  const currentDueDate = getCurrentDueDate(goal.start_date || goal.created_at, today);
  const periodStart = addMonths(currentDueDate, -1);
  const nextDueDate = addMonths(currentDueDate, 1);
  const paidThisPeriod = payments
    .filter((payment) => {
      const paymentDate = startOfDay(new Date(payment.payment_date));
      return paymentDate > periodStart && paymentDate < nextDueDate;
    })
    .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);

  const isCurrentPeriodCovered = paidThisPeriod >= monthlyContribution;
  const dueDate = isCurrentPeriodCovered ? nextDueDate : currentDueDate;
  const amountDue = isCurrentPeriodCovered
    ? monthlyContribution
    : Math.max(0, monthlyContribution - paidThisPeriod);
  const daysToDue = diffDays(today, dueDate);
  const status = getPaymentStatus(daysToDue);

  return {
    goalId: goal.goal_id,
    title: goal.title,
    dueDate,
    dueDateLabel: formatPaymentDate(dueDate),
    daysToDue,
    message: getPaymentMessage(daysToDue),
    monthlyContribution,
    paidThisPeriod,
    remainingForPeriod: Math.max(0, monthlyContribution - paidThisPeriod),
    amountDue,
    isCurrentPeriodCovered,
    status,
    shouldNotify: ["overdue", "today", "upcoming"].includes(status),
  };
}

export function formatPaymentDate(date) {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

export function getPaymentStatusLabel(status) {
  switch (status) {
    case "overdue":
      return "Платеж просрочен";
    case "today":
      return "Внести сегодня";
    case "upcoming":
      return "Скоро платеж";
    default:
      return "Следующий платеж";
  }
}

function getCurrentDueDate(startDateValue, today) {
  const startDate = startDateValue ? new Date(startDateValue) : today;
  const dueDay = startDate.getDate() || 1;
  return startOfDay(createSafeDate(today.getFullYear(), today.getMonth(), dueDay));
}

function getPaymentStatus(daysToDue) {
  if (daysToDue < 0) return "overdue";
  if (daysToDue === 0) return "today";
  if (daysToDue <= REMINDER_WINDOW_DAYS) return "upcoming";
  return "scheduled";
}

function getPaymentMessage(daysToDue) {
  if (daysToDue < 0) {
    const overdueDays = Math.abs(daysToDue);
    return `Платеж просрочен на ${overdueDays} ${pluralDays(overdueDays)}`;
  }

  if (daysToDue === 0) {
    return "Платеж нужно внести сегодня";
  }

  return `До следующего платежа ${daysToDue} ${pluralDays(daysToDue)}`;
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
