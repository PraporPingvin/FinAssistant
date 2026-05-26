import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  ChevronLeft,
  Home,
  Target,
  CreditCard,
  Wallet,
  TrendingUp,
  Plus,
  RefreshCw,
  BarChart3,
  Clock,
  AlertCircle,
} from "lucide-react";
import Layout from "../../components/Layout";
import { getGoal, getPayments, createPayment, updatePayment, deletePayment } from "../../api/api";
import PaymentForm from "../../components/Payment/PaymentForm/PaymentForm";
import PaymentEditForm from "../../components/Payment/PaymentEditForm/PaymentEditForm";
import PaymentList from "../../components/Payment/PaymentList/PaymentList";
import "./PaymentsPage.css";

function PaymentsPage() {
  const { goalId } = useParams();
  const navigate = useNavigate();

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

  const loadData = async () => {
    try {
      setLoading(true);
      setError("");

      const [goalData, paymentsData] = await Promise.all([
        getGoal(goalId),
        getPayments(goalId).catch(() => [])
      ]);

      if (!goalData) {
        setError("Цель не найдена");
        return;
      }

      setGoal(goalData);
      setPayments(paymentsData);

      const total = paymentsData.reduce((sum, payment) => {
        const amount = parseFloat(payment.amount) || 0;
        return sum + amount;
      }, 0);

      setTotalAmount(total);

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
        goal_id: parseInt(goalId)
      });
      await loadData();
      setShowForm(false);
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
    return new Intl.NumberFormat('ru-RU').format(num);
  };

  const getStatusText = (status) => {
    switch (status) {
      case "active": return "В процессе";
      case "completed": return "Выполнена";
      case "paused": return "Приостановлена";
      default: return status;
    }
  };

  const stats = {
    totalAmount: totalAmount,
    averagePayment: payments.length > 0 ? Math.round(totalAmount / payments.length) : 0,
    remainingAmount: goal ? Math.max(0, (parseFloat(goal.target_amount) || 0) - (parseFloat(goal.current_amount) || 0)) : 0
  };

  const progressPercent = goal?.target_amount > 0
    ? Math.round(((parseFloat(goal?.current_amount) || 0) / parseFloat(goal.target_amount)) * 100)
    : 0;

  if (loading) {
    return (
      <Layout>
        <div className="loadingContainer">
          <div className="loadingSpinner" />
          <p>Загружаем данные...</p>
        </div>
      </Layout>
    );
  }

  if (error || !goal) {
    return (
      <Layout>
        <div className="paymentsPage">
          <div className="errorCard">
            <AlertCircle size={48} />
            <h2>Ошибка</h2>
            <p>{error || "Цель не найдена"}</p>
            <Link to="/goals" className="backButtonLink">← Вернуться к списку целей</Link>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="paymentsPage">
        <div className="breadcrumb">
          <Link to="/"><Home size={14} /> Главная</Link>
          <span>/</span>
          <Link to="/goals"><Target size={14} /> Цели</Link>
          <span>/</span>
          <Link to={`/goals/${goalId}`}>{goal.title}</Link>
          <span>/</span>
          <span className="current">Платежи</span>
        </div>

        <div className="paymentsHeader">
          <div>
            <h1 className="pageTitle">Управление платежами</h1>
            <p className="pageSubtitle">Цель: {goal.title}</p>
          </div>
        </div>

        <div className="goalInfoCard">
          <div className="goalInfoRow">
            <div className="goalInfoItem">
              <Target size={18} />
              <div>
                <span className="goalInfoLabel">Цель</span>
                <span className="goalInfoValue">{goal.title}</span>
              </div>
            </div>
            <div className="goalInfoItem">
              <TrendingUp size={18} />
              <div>
                <span className="goalInfoLabel">Прогресс</span>
                <span className="goalInfoValue">{progressPercent}% ({formatCurrency(goal.current_amount)} / {formatCurrency(goal.target_amount)} ₽)</span>
              </div>
            </div>
            <div className="goalInfoItem">
              <CreditCard size={18} />
              <div>
                <span className="goalInfoLabel">Взнос</span>
                <span className="goalInfoValue">{formatCurrency(goal.monthly_contribution)} ₽/мес</span>
              </div>
            </div>
            <div className="goalInfoItem">
              <Clock size={18} />
              <div>
                <span className="goalInfoLabel">Статус</span>
                <span className="goalInfoValue">{getStatusText(goal.status)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="statsContainer">
          <div className="statCard">
            <Wallet size={24} />
            <div className="statNumber">{payments.length}</div>
            <div className="statLabel">Всего платежей</div>
          </div>
          <div className="statCard">
            <CreditCard size={24} />
            <div className="statNumber">{formatCurrency(stats.totalAmount)} ₽</div>
            <div className="statLabel">Общая сумма</div>
          </div>
          <div className="statCard">
            <BarChart3 size={24} />
            <div className="statNumber">{formatCurrency(stats.averagePayment)} ₽</div>
            <div className="statLabel">Средний платеж</div>
          </div>
          <div className="statCard">
            <Target size={24} />
            <div className="statNumber">{formatCurrency(stats.remainingAmount)} ₽</div>
            <div className="statLabel">Осталось до цели</div>
          </div>
        </div>

        <div className="addPaymentContainer">
          <button
            onClick={() => {
              setShowForm(!showForm);
              setEditingPayment(null);
            }}
            className={`addPaymentButton ${showForm ? 'active' : ''}`}
          >
            <Plus size={18} />
            {showForm ? "Скрыть форму" : "Добавить платеж"}
          </button>
        </div>

        <div className="contentGrid">
          <div className="contentSection infoSection">
            <h2 className="sectionTitle">
              {editingPayment ? "Редактирование платежа" : (showForm ? "Новый платеж" : "Информация")}
            </h2>

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
                onCancel={() => setShowForm(false)}
              />
            ) : (
              <div>
                <p className="infoText">
                  Для добавления нового платежа нажмите кнопку "Добавить платеж".
                  Платежи автоматически увеличивают текущую сумму цели.
                </p>
                <div className="tipSection">
                  <strong>💡 Доступные действия:</strong>
                  <ul>
                    <li>Нажмите на кнопку с карандашом, чтобы отредактировать платеж</li>
                    <li>Нажмите на корзину, чтобы удалить платеж</li>
                    <li>При удалении сумма платежа вычитается из текущего прогресса цели</li>
                  </ul>
                </div>
              </div>
            )}
          </div>

          <div className="contentSection">
            <div className="paymentsListHeader">
              <h2 className="sectionTitle">История платежей</h2>
              <button onClick={loadData} className="refreshButton">
                <RefreshCw size={14} />
                Обновить
              </button>
            </div>

            {payments.length > 0 ? (
              <PaymentList 
                payments={payments} 
                onEdit={setEditingPayment}
                onDelete={handleDeletePayment}
              />
            ) : (
              <div className="emptyState">
                <Wallet size={48} />
                <h3>Платежей пока нет</h3>
                <p>Добавьте первый платеж для вашей цели</p>
                <button onClick={() => setShowForm(true)} className="emptyStateButton">
                  <Plus size={16} />
                  Добавить первый платеж
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="backButtonSection">
          <button onClick={handleBack} className="backButton">
            <ChevronLeft size={16} />
            Вернуться к цели
          </button>
        </div>
      </div>
    </Layout>
  );
}

export default PaymentsPage;