import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link, useLocation } from "react-router-dom";
import {
  AlertCircle,
  BarChart3,
  CalendarClock,
  ChevronLeft,
  CreditCard,
  Home,
  Plus,
  RefreshCw,
  Target,
  TrendingUp,
  Wallet,
} from "lucide-react";
import Layout from "../../components/Layout";
import { getGoal, getPayments, createPayment, updatePayment, deletePayment } from "../../api/api";
import PaymentForm from "../../components/Payment/PaymentForm/PaymentForm";
import PaymentEditForm from "../../components/Payment/PaymentEditForm/PaymentEditForm";
import PaymentList from "../../components/Payment/PaymentList/PaymentList";
import { buildPaymentSchedule, getPaymentStatusLabel } from "../../utils/paymentSchedule";
import "./PaymentsPage.css";

function PaymentsPage() {
  const { goalId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const isCreatePaymentPage = location.pathname.endsWith("/payments/new");
  const formSectionRef = React.useRef(null);

  const [goal, setGoal] = useState(null);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingPayment, setEditingPayment] = useState(null);
  const [totalAmount, setTotalAmount] = useState(0);

  useEffect(() => {
    if (goalId) {
      loadData();
    }
  }, [goalId]);

  useEffect(() => {
    if (isCreatePaymentPage) {
      setShowForm(true);
      setEditingPayment(null);
    }
  }, [isCreatePaymentPage]);

  useEffect(() => {
    if (isCreatePaymentPage && !loading) {
      requestAnimationFrame(() => {
        formSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
  }, [isCreatePaymentPage, loading]);

  useEffect(() => {
    if (editingPayment) {
      requestAnimationFrame(() => {
        formSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
  }, [editingPayment]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError("");

      const [goalData, paymentsData] = await Promise.all([
        getGoal(goalId),
        getPayments(goalId).catch(() => []),
      ]);

      if (!goalData) {
        setError("Цель не найдена");
        return;
      }

      setGoal(goalData);
      setPayments(paymentsData);
      setTotalAmount(paymentsData.reduce((sum, payment) => sum + (parseFloat(payment.amount) || 0), 0));
    } catch (error) {
      console.error("Ошибка загрузки данных:", error);
      setError("Не удалось загрузить данные");
    } finally {
      setLoading(false);
    }
  };

  const handleAddPayment = async (paymentData) => {
    try {
      await createPayment({
        ...paymentData,
        goal_id: parseInt(goalId),
      });
      await loadData();
      setShowForm(false);
      if (isCreatePaymentPage) {
        navigate(`/goals/${goalId}/payments`);
      }
    } catch (error) {
      console.error("Ошибка добавления платежа:", error);
      setError("Не удалось добавить платеж");
    }
  };

  const handleEditPayment = async (paymentData) => {
    try {
      await updatePayment(editingPayment.payment_id, paymentData);
      await loadData();
      setEditingPayment(null);
    } catch (error) {
      console.error("Ошибка обновления платежа:", error);
      setError("Не удалось обновить платеж");
    }
  };

  const handleDeletePayment = async (paymentId) => {
    try {
      await deletePayment(paymentId);
      await loadData();
    } catch (error) {
      console.error("Ошибка удаления платежа:", error);
      setError("Не удалось удалить платеж");
    }
  };

  const handleBack = () => {
    navigate(`/goals/${goalId}`);
  };

  const formatCurrency = (amount) => {
    const num = parseFloat(amount) || 0;
    return new Intl.NumberFormat("ru-RU").format(num);
  };

  const getStatusText = (status) => {
    switch (status) {
      case "active":
        return "В процессе";
      case "completed":
        return "Выполнена";
      case "paused":
        return "Приостановлена";
      default:
        return status || "Без статуса";
    }
  };

  const stats = {
    totalAmount,
    averagePayment: payments.length > 0 ? Math.round(totalAmount / payments.length) : 0,
    currentAmount: goal ? (parseFloat(goal.initial_amount) || 0) + totalAmount : 0,
    remainingAmount: goal ? Math.max(0, (parseFloat(goal.target_amount) || 0) - ((parseFloat(goal.initial_amount) || 0) + totalAmount)) : 0,
  };

  const progressPercent = goal?.target_amount > 0
    ? Math.min(100, Math.round((stats.currentAmount / parseFloat(goal.target_amount)) * 100))
    : 0;

  const paymentSchedule = React.useMemo(
    () => buildPaymentSchedule(goal, payments),
    [goal, payments]
  );

  if (loading) {
    return (
      <Layout>
        <div className="paymentsLoading">
          <div className="paymentsSpinner" />
          <p>Загружаем платежи и прогресс цели...</p>
        </div>
      </Layout>
    );
  }

  if (error || !goal) {
    return (
      <Layout>
        <div className="paymentsPage">
          <div className="paymentsErrorCard">
            <AlertCircle size={48} />
            <h2>Не удалось открыть платежи</h2>
            <p>{error || "Цель не найдена"}</p>
            <Link to="/goals" className="paymentsBackLink">Вернуться к целям</Link>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="paymentsPage">
        <nav className="paymentsBreadcrumb">
          <Link to="/"><Home size={14} /> Главная</Link>
          <span>/</span>
          <Link to="/goals"><Target size={14} /> Цели</Link>
          <span>/</span>
          <Link to={`/goals/${goalId}`}>{goal.title}</Link>
          <span>/</span>
          <span>Платежи</span>
          {isCreatePaymentPage && (
            <>
              <span>/</span>
              <span>Новый платеж</span>
            </>
          )}
        </nav>

        <section className="paymentsHero">
          <div className="paymentsHeroContent">
            <span className="paymentsEyebrow">Денежный поток цели</span>
            <h1>Платежи по цели</h1>
            <p>{goal.title}</p>
            <div className="heroActions">
              <button
                onClick={() => navigate(`/goals/${goalId}/payments/new`)}
                className="heroPrimaryButton"
              >
                <Plus size={18} /> Добавить платеж
              </button>
              <button onClick={handleBack} className="heroGhostButton">
                <ChevronLeft size={18} /> К цели
              </button>
            </div>
          </div>

          <div className="paymentsHeroPanel">
            <span>Прогресс</span>
            <strong>{progressPercent}%</strong>
            <div className="paymentsProgressTrack">
              <div style={{ width: `${progressPercent}%` }} />
            </div>
            <small>{formatCurrency(stats.currentAmount)} из {formatCurrency(goal.target_amount)} ₽</small>
          </div>
        </section>

        <section className="paymentsStatsGrid">
          <article className="paymentsStatCard accent">
            <Wallet size={24} />
            <span>Платежей</span>
            <strong>{payments.length}</strong>
          </article>
          <article className="paymentsStatCard">
            <CreditCard size={24} />
            <span>Внесено</span>
            <strong>{formatCurrency(stats.totalAmount)} ₽</strong>
          </article>
          <article className="paymentsStatCard">
            <BarChart3 size={24} />
            <span>Средний платеж</span>
            <strong>{formatCurrency(stats.averagePayment)} ₽</strong>
          </article>
          <article className="paymentsStatCard">
            <Target size={24} />
            <span>Осталось</span>
            <strong>{formatCurrency(stats.remainingAmount)} ₽</strong>
          </article>
        </section>

        <section className="goalSnapshotCard">
          <div className="goalSnapshotItem">
            <Target size={18} />
            <span>Цель</span>
            <strong>{goal.title}</strong>
          </div>
          <div className="goalSnapshotItem">
            <TrendingUp size={18} />
            <span>Прогресс</span>
            <strong>{progressPercent}%</strong>
          </div>
          <div className="goalSnapshotItem">
            <CreditCard size={18} />
            <span>Плановый взнос</span>
            <strong>{formatCurrency(goal.monthly_contribution)} ₽/мес</strong>
          </div>
          <div className="goalSnapshotItem">
            <Wallet size={18} />
            <span>Статус</span>
            <strong>{getStatusText(goal.status)}</strong>
          </div>
        </section>

        {paymentSchedule && (
          <section className={`nextPaymentCard ${paymentSchedule.status}`}>
            <div className="nextPaymentIcon">
              <CalendarClock size={24} />
            </div>
            <div className="nextPaymentContent">
              <span>{getPaymentStatusLabel(paymentSchedule.status)}</span>
              <h2>Следующий платеж: {paymentSchedule.dueDateLabel}</h2>
              <p>
                {paymentSchedule.isCurrentPeriodCovered
                  ? `Текущий период уже закрыт. Следующий плановый взнос: ${formatCurrency(paymentSchedule.amountDue)} ₽.`
                  : `${paymentSchedule.message}. Осталось внести за текущий период: ${formatCurrency(paymentSchedule.amountDue)} ₽.`}
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate(`/goals/${goalId}/payments/new`)}
              className="nextPaymentButton"
            >
              <Plus size={16} /> Внести платеж
            </button>
          </section>
        )}

        <section className="paymentsWorkspace">
          <aside className="paymentsSidePanel" ref={formSectionRef}>
            <div className="sidePanelHeader">
              <span>{editingPayment ? "Редактирование" : showForm ? "Новый платеж" : "Быстрое действие"}</span>
              <button
                onClick={() => {
                  if (!showForm) {
                    navigate(`/goals/${goalId}/payments/new`);
                    return;
                  }
                  if (isCreatePaymentPage) {
                    navigate(`/goals/${goalId}/payments`);
                  }
                  setShowForm(false);
                  setEditingPayment(null);
                }}
                className={`togglePaymentButton ${showForm ? "active" : ""}`}
              >
                <Plus size={16} /> {showForm ? "Скрыть" : "Добавить"}
              </button>
            </div>

            {editingPayment ? (
              <PaymentEditForm
                payment={editingPayment}
                goal={goal}
                onSubmit={handleEditPayment}
                onCancel={() => setEditingPayment(null)}
              />
            ) : showForm ? (
              <PaymentForm
                goal={goal}
                onSubmit={handleAddPayment}
                onCancel={() => {
                  setShowForm(false);
                  if (isCreatePaymentPage) {
                    navigate(`/goals/${goalId}/payments`);
                  }
                }}
              />
            ) : (
              <div className="paymentGuide">
                <h2>Пополняйте цель без лишних шагов</h2>
                <p>Добавленный платеж сразу обновит текущую сумму цели. История ниже поможет быстро найти, изменить или удалить любой взнос.</p>
                <div className="guideList">
                  <span>Редактируйте платежи через кнопку карандаша</span>
                  <span>Удаление вычитает сумму из прогресса цели</span>
                  <span>Суммы и даты проверяются перед сохранением</span>
                </div>
              </div>
            )}
          </aside>

          <main className="paymentsHistoryCard">
            <div className="paymentsHistoryHeader">
              <div>
                <span>История</span>
                <h2>Все платежи</h2>
              </div>
              <button onClick={loadData} className="refreshPaymentsButton">
                <RefreshCw size={15} /> Обновить
              </button>
            </div>

            {payments.length > 0 ? (
              <PaymentList
                payments={payments}
                onEdit={(payment) => {
                  setEditingPayment(payment);
                  setShowForm(false);
                }}
                onDelete={handleDeletePayment}
              />
            ) : (
              <div className="paymentsEmptyState">
                <Wallet size={48} />
                <h3>Платежей пока нет</h3>
                <p>Добавьте первый платеж, чтобы увидеть историю пополнений и статистику.</p>
                <button onClick={() => navigate(`/goals/${goalId}/payments/new`)} className="emptyPaymentButton">
                  <Plus size={16} /> Добавить первый платеж
                </button>
              </div>
            )}
          </main>
        </section>
      </div>
    </Layout>
  );
}

export default PaymentsPage;
