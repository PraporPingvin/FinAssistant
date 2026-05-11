import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import Layout from "../../components/Layout";
import { getGoal, getPayments, createPayment } from "../../api/api";
import PaymentForm from "../../components/Payment/PaymentForm/PaymentForm";
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

      // Загружаем цель и платежи отдельно
      const [goalData, paymentsData] = await Promise.all([
        getGoal(goalId), // Используем getGoal вместо getGoals
        getPayments(goalId).catch(() => []) // Защита от ошибок
      ]);

      if (!goalData) {
        setError("Цель не найдена");
        return;
      }

      setGoal(goalData);
      setPayments(paymentsData);

      // Рассчитываем общую сумму ТОЧНО как в таблице
      const total = paymentsData.reduce((sum, payment) => {
        // Преобразуем amount в число для гарантии
        const amount = parseFloat(payment.amount) || 0;
        return sum + amount;
      }, 0);

      setTotalAmount(total);
      console.log("Рассчитанная сумма платежей:", total, "Платежей:", paymentsData.length);

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

      // Добавляем платеж в начало списка
      setPayments(prev => [newPayment, ...prev]);

      // Обновляем общую сумму с новым платежом
      const paymentAmount = parseFloat(newPayment.amount) || 0;
      setTotalAmount(prev => prev + paymentAmount);

      // Обновляем данные цели
      const updatedGoal = await getGoal(goalId);
      setGoal(updatedGoal);

      setShowForm(false);

      alert("Платеж успешно добавлен!");

    } catch (error) {
      console.error("Ошибка добавления платежа:", error);
      alert("Не удалось добавить платеж");
    }
  };

  const handleBack = () => {
    navigate(`/goals/${goalId}`);
  };

  const formatCurrency = (amount) => {
    const num = parseFloat(amount) || 0;
    return new Intl.NumberFormat('ru-RU').format(num);
  };

  const formatDate = (dateString) => {
    if (!dateString) return "";
    return new Date(dateString).toLocaleDateString('ru-RU');
  };

  const getStatusText = (status) => {
    switch (status) {
      case "active": return "В процессе";
      case "completed": return "Выполнена";
      case "paused": return "Приостановлена";
      default: return status;
    }
  };

  // Расчет статистики
  const calculateStats = () => {
    if (!payments || payments.length === 0) {
      return {
        totalAmount: 0,
        averagePayment: 0,
        remainingAmount: goal ? Math.max(0, (parseFloat(goal.target_amount) || 0) - (parseFloat(goal.current_amount) || 0)) : 0
      };
    }

    // Преобразуем все суммы в числа
    const validPayments = payments.map(p => ({
      ...p,
      amount: parseFloat(p.amount) || 0
    }));

    const total = validPayments.reduce((sum, payment) => sum + payment.amount, 0);
    const average = Math.round(total / validPayments.length);

    const remaining = goal
      ? Math.max(0, (parseFloat(goal.target_amount) || 0) - (parseFloat(goal.current_amount) || 0))
      : 0;

    console.log("Статистика:", {
      total,
      average,
      remaining,
      paymentsCount: validPayments.length,
      payments: validPayments.map(p => ({ id: p.payment_id, amount: p.amount }))
    });

    return { totalAmount: total, averagePayment: average, remainingAmount: remaining };
  };

  const stats = calculateStats();
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
        {/* Хлебные крошки */}
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

        {/* Заголовок */}
        <div className="paymentsHeader">
          <div className="headerContent">
            <h1>Управление платежами</h1>
            <p className="headerSubtitle">
              Цель: {goal.title}
            </p>
          </div>
        </div>

        {/* Информация о цели */}
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



        {/* Статистика */}
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

        {/* Кнопка добавления платежа */}
        <div className="addPaymentContainer">
          <button
            onClick={() => setShowForm(!showForm)}
            className={`addPaymentButton ${showForm ? 'addPaymentButtonActive' : ''}`}
          >
            {showForm ? "✖️ Скрыть форму" : "＋ Добавить платеж"}
          </button>
        </div>
        
        {/* Основной контент */}
        <div className="contentGrid">
          {/* Левая колонка: Форма или информация */}
          <div className="contentSection infoSection">
            <h2 className="sectionTitle">
              {showForm ? "➕ Новый платеж" : "📋 Информация"}
            </h2>

            {showForm ? (
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
                    <strong>Требования:</strong>
                    <ul className="requirementsList">
                      <li>Сумма платежа должна быть положительной</li>
                      <li>Дата платежа не может быть в будущем</li>
                      <li>Обязательно укажите описание платежа</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Правая колонка: Список платежей */}
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
              <PaymentList payments={payments} />
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

        {/* Кнопка возврата */}
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