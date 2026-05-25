import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
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
      const newPayment = await createPayment({
        ...paymentData,
        goal_id: parseInt(goalId)
      });

      await loadData(); // Перезагружаем все данные
      setShowForm(false);

      alert("Платеж успешно добавлен!");

    } catch (error) {
      console.error("Ошибка добавления платежа:", error);
      alert("Не удалось добавить платеж");
    }
  };

  const handleEditPayment = async (paymentData) => {
    try {
      await updatePayment(editingPayment.payment_id, paymentData);
      await loadData(); // Перезагружаем все данные
      setEditingPayment(null);
      alert("Платеж успешно обновлен!");
    } catch (error) {
      console.error("Ошибка обновления платежа:", error);
      alert("Не удалось обновить платеж");
    }
  };

  const handleDeletePayment = async (paymentId) => {
    try {
      await deletePayment(paymentId);
      await loadData(); // Перезагружаем все данные
      alert("Платеж успешно удален!");
    } catch (error) {
      console.error("Ошибка удаления платежа:", error);
      alert("Не удалось удалить платеж");
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
          <div className="loadingAnimation"></div>
          <p>Загружаем данные...</p>
        </div>
      </Layout>
    );
  }

  if (error || !goal) {
    return (
      <Layout>
        <div className="paymentsContainer">
          <div className="errorMessage">
            <strong>Внимание:</strong> {error || "Цель не найдена"}
          </div>
          <Link to="/goals" className="backButton">
            ← Вернуться к списку целей
          </Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="paymentsContainer">
        <div className="breadcrumb">
          <Link to="/">Главная</Link>
          {" > "}
          <Link to="/goals">Цели</Link>
          {" > "}
          <Link to={`/goals/${goalId}`}>
            {goal.title}
          </Link>
          {" > "}
          <span>Платежи</span>
        </div>

        <div className="paymentsHeader">
          <div className="headerContent">
            <h1>Управление платежами</h1>
            <p className="headerSubtitle">
              Цель: {goal.title}
            </p>
          </div>
        </div>

        <div className="goalInfoCard">
          <div className="goalInfoRow">
            <div className="goalInfoLeft">
              <div className="goalInfoLabel">Цель:</div>
              <div className="goalInfoValue">{goal.title}</div>

              <div className="goalInfoLabel" style={{ marginTop: "10px" }}>Прогресс:</div>
              <div className="goalInfoValue">
                {progressPercent}% ({formatCurrency(goal.current_amount)} / {formatCurrency(goal.target_amount)} ₽)
              </div>
            </div>

            <div className="goalInfoRight">
              <div className="goalInfoLabel">Ежемесячный взнос:</div>
              <div className="goalInfoValue">{formatCurrency(goal.monthly_contribution)} ₽</div>

              <div className="goalInfoLabel" style={{ marginTop: "10px" }}>Статус:</div>
              <div className="goalInfoValue">{getStatusText(goal.status)}</div>
            </div>
          </div>
        </div>

        <div className="statsContainer">
          <div className="statCard">
            <h3>Всего платежей</h3>
            <div className="statNumber">{payments.length}</div>
          </div>
          <div className="statCard">
            <h3>Общая сумма</h3>
            <div className="statNumber">{formatCurrency(stats.totalAmount)}<span className="currency"> ₽</span></div>
          </div>
          <div className="statCard">
            <h3>Средний платеж</h3>
            <div className="statNumber">{formatCurrency(stats.averagePayment)}<span className="currency"> ₽</span></div>
          </div>
          <div className="statCard">
            <h3>Осталось до цели</h3>
            <div className="statNumber">{formatCurrency(stats.remainingAmount)}<span className="currency"> ₽</span></div>
          </div>
        </div>

        <div className="addPaymentContainer">
          <button
            onClick={() => {
              setShowForm(!showForm);
              setEditingPayment(null);
            }}
            className={`addPaymentButton ${showForm ? 'addPaymentButtonActive' : ''}`}
          >
            {showForm ? "✖️ Скрыть форму" : "＋ Добавить платеж"}
          </button>
        </div>
        
        <div className="contentGrid">
          <div className="contentSection infoSection">
            <h2 className="sectionTitle">
              {editingPayment ? "✏️ Редактирование платежа" : (showForm ? "➕ Новый платеж" : "📋 Информация")}
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
                </p>

                <div className="tipSection">
                  <strong>💡 Подсказка:</strong> Платежи автоматически увеличивают текущую сумму цели.

                  <div style={{ marginTop: "15px" }}>
                    <strong>Доступные действия:</strong>
                    <ul className="requirementsList">
                      <li>✏️ Нажмите на кнопку с карандашом, чтобы отредактировать платеж</li>
                      <li>🗑️ Нажмите на корзину, чтобы удалить платеж</li>
                      <li>При удалении сумма платежа вычитается из текущего прогресса цели</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="contentSection">
            <div className="paymentsListHeader">
              <h2 className="sectionTitle">📋 История платежей</h2>
              <button
                onClick={loadData}
                className="refreshButton"
              >
                ⟳ Обновить
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
                <h3 className="emptyStateTitle">Платежей пока нет</h3>
                <p>Добавьте первый платеж для вашей цели</p>
                <button
                  onClick={() => setShowForm(true)}
                  className="emptyStateButton"
                >
                  Добавить первый платеж
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="backButtonSection">
          <button
            onClick={handleBack}
            className="backButton"
          >
            ← Вернуться к цели
          </button>
        </div>
      </div>
    </Layout>
  );
}

export default PaymentsPage;