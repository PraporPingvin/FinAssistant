// src/pages/GoalsPage/GoalDetailPage/GoalDetailPage.jsx
import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import Layout from "../../../components/Layout";
import { getGoal, getScenarios, getPayments, deleteGoal } from "../../../api/api";
import "./GoalDetailPage.css";

function GoalDetailPage() {
  const { goalId } = useParams();
  const navigate = useNavigate();
  
  const [goal, setGoal] = useState(null);
  const [scenarios, setScenarios] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    if (goalId) {
      loadData();
    }
  }, [goalId]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError("");
      
      // Загружаем цель
      const goalData = await getGoal(goalId);
      
      if (!goalData) {
        setError("Цель не найдена");
        return;
      }
      
      setGoal(goalData);
      
      // Загружаем сценарии для этой цели
      try {
        const scenariosData = await getScenarios(goalId);
        setScenarios(scenariosData || []);
      } catch (scenarioError) {
        console.error("Ошибка загрузки сценариев:", scenarioError);
        setScenarios([]);
      }
      
      // Загружаем платежи для этой цели
      try {
        const paymentsData = await getPayments(goalId);
        setPayments(paymentsData || []);
      } catch (paymentError) {
        console.error("Ошибка загрузки платежей:", paymentError);
        setPayments([]);
      }
      
    } catch (error) {
      console.error("Ошибка загрузки данных:", error);
      setError(`Не удалось загрузить данные: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteGoal = async () => {
    if (!window.confirm(`Вы уверены, что хотите удалить цель "${goal?.title}"? Это действие нельзя отменить.`)) {
      return;
    }
    
    try {
      setDeleting(true);
      await deleteGoal(goalId);
      alert("Цель успешно удалена!");
      navigate("/goals");
    } catch (error) {
      console.error("Ошибка удаления цели:", error);
      alert(`Ошибка удаления: ${error.message}`);
    } finally {
      setDeleting(false);
    }
  };

  const formatCurrency = (amount) => {
    const num = parseFloat(amount) || 0;
    return new Intl.NumberFormat('ru-RU').format(num);
  };

  const formatDate = (dateString) => {
    if (!dateString) return "—";
    try {
      return new Date(dateString).toLocaleDateString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch {
      return "—";
    }
  };

  const calculateProgress = () => {
    if (!goal) return 0;
    const target = parseFloat(goal.target_amount) || 1;
    const current = parseFloat(goal.current_amount) || 0;
    return Math.min(Math.round((current / target) * 100), 100);
  };

  const calculateRemainingMonths = () => {
    if (!goal) return null;
    
    const target = parseFloat(goal.target_amount) || 0;
    const current = parseFloat(goal.current_amount) || 0;
    const monthly = parseFloat(goal.monthly_contribution) || 0;
    
    if (monthly <= 0) return null;
    
    const remaining = target - current;
    if (remaining <= 0) return 0;
    
    return Math.ceil(remaining / monthly);
  };

  const getStatusText = (status) => {
    switch (status) {
      case "active": return "Активна";
      case "completed": return "Выполнена";
      case "paused": return "Приостановлена";
      default: return status;
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="loadingContainer">
          <div className="loadingSpinner"></div>
          <p>Загружаем данные цели...</p>
        </div>
      </Layout>
    );
  }

  if (error || !goal) {
    return (
      <Layout>
        <div className="goalDetailContainer">
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

  const progress = calculateProgress();
  const remainingMonths = calculateRemainingMonths();
  const totalPayments = payments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);

  return (
    <Layout>
      <div className="goalDetailContainer">
        {/* Хлебные крошки */}
        <div className="breadcrumb">
          <Link to="/">Главная</Link>
          <span className="separator">›</span>
          <Link to="/goals">Цели</Link>
          <span className="separator">›</span>
          <span>{goal.title}</span>
        </div>

        {/* Заголовок и действия */}
        <div className="goalHeader">
          <div className="goalTitleSection">
            <h1>{goal.title}</h1>
            <span className={`goalStatusBadge status${goal.status}`}>
              {getStatusText(goal.status)}
            </span>
          </div>
          
          <div className="goalActionsButton">
            <button
              onClick={() => navigate(`/goals/${goalId}/edit`)}
              className="actionButtonGoal editButtonGoal"
            >
              ✏️ Редактировать
            </button>
            <button
              onClick={() => navigate(`/scenarios/${goalId}`)}
              className="actionButtonGoal scenariosButtonGoal"
            >
              📈 Сценарии ({scenarios.length})
            </button>
            <button
              onClick={() => navigate(`/payments/${goalId}`)}
              className="actionButtonGoal paymentsButtonGoal"
            >
              💳 Платежи
            </button>
            <button
              onClick={handleDeleteGoal}
              className="actionButtonGoal deleteButtonGoal"
              disabled={deleting}
            >
              {deleting ? "🗑️ Удаление..." : "🗑️ Удалить"}
            </button>
          </div>
        </div>

        {/* Основная информация */}
        <div className="goalOverview">
          <div className="goalStatsDetail">
            <div className="statCard">
              <div className="statIcon">🎯</div>
              <div className="statLabel">Целевая сумма</div>
              <div className="statValue">{formatCurrency(goal.target_amount)} ₽</div>
            </div>
            
            <div className="statCard">
              <div className="statIcon">💰</div>
              <div className="statLabel">Текущая сумма</div>
              <div className="statValue">{formatCurrency(goal.current_amount)} ₽</div>
            </div>
            
            <div className="statCard">
              <div className="statIcon">📊</div>
              <div className="statLabel">Прогресс</div>
              <div className="statValue">{progress}%</div>
            </div>
            
            <div className="statCard">
              <div className="statIcon">⏱️</div>
              <div className="statLabel">Осталось месяцев</div>
              <div className="statValue">
                {remainingMonths !== null ? remainingMonths : "—"}
              </div>
            </div>
          </div>

          {/* Прогресс-бар */}
          <div className="progressSection">
            <div className="progressLabel">
              <span>Прогресс достижения цели</span>
              <span className="progressPercentage">{progress}%</span>
            </div>
            <div className="progressBar">
              <div 
                className="progressFill"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>

        {/* Детальная информация */}
        <div className="goalDetails">
          <div className="detailsCard">
            <h3>Детали цели</h3>
            <div className="detailsGrid">
              <div className="detailRow">
                <span className="detailLabel">Дата начала:</span>
                <span className="detailValue">{formatDate(goal.start_date)}</span>
              </div>
              
              <div className="detailRow">
                <span className="detailLabel">Плановая дата завершения:</span>
                <span className="detailValue">{formatDate(goal.deadline_date) || "—"}</span>
              </div>
              
              <div className="detailRow">
                <span className="detailLabel">Ежемесячный взнос:</span>
                <span className="detailValue">{formatCurrency(goal.monthly_contribution)} ₽</span>
              </div>
              
              <div className="detailRow">
                <span className="detailLabel">Начальная сумма:</span>
                <span className="detailValue">{formatCurrency(goal.initial_amount)} ₽</span>
              </div>
              
              <div className="detailRow">
                <span className="detailLabel">Создана:</span>
                <span className="detailValue">{formatDate(goal.created_at)}</span>
              </div>
              
              <div className="detailRow">
                <span className="detailLabel">Обновлена:</span>
                <span className="detailValue">{formatDate(goal.updated_at)}</span>
              </div>
            </div>
          </div>

          <div className="detailsCard">
            <h3>Финансовая информация</h3>
            <div className="detailsGrid">
              <div className="detailRow highlight">
                <span className="detailLabel">Осталось накопить:</span>
                <span className="detailValue">
                  {formatCurrency(goal.target_amount - goal.current_amount)} ₽
                </span>
              </div>
              
              <div className="detailRow">
                <span className="detailLabel">Всего платежей:</span>
                <span className="detailValue">{payments.length}</span>
              </div>
              
              <div className="detailRow">
                <span className="detailLabel">Общая сумма платежей:</span>
                <span className="detailValue">{formatCurrency(totalPayments)} ₽</span>
              </div>
              
              <div className="detailRow">
                <span className="detailLabel">Средний платеж:</span>
                <span className="detailValue">
                  {payments.length > 0 ? formatCurrency(totalPayments / payments.length) : "0"} ₽
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Вкладки */}
        <div className="tabsSection">
          <div className="tabsHeader">
            <button 
              className={`tabButton ${activeTab === "overview" ? "active" : ""}`}
              onClick={() => setActiveTab("overview")}
            >
              Обзор
            </button>
            <button 
              className={`tabButton ${activeTab === "scenarios" ? "active" : ""}`}
              onClick={() => setActiveTab("scenarios")}
            >
              Сценарии ({scenarios.length})
            </button>
            <button 
              className={`tabButton ${activeTab === "payments" ? "active" : ""}`}
              onClick={() => setActiveTab("payments")}
            >
              История платежей ({payments.length})
            </button>
          </div>

          <div className="tabContent">
            {activeTab === "overview" && (
              <div className="overviewTab">
                <p>Здесь будет общая информация о цели и рекомендации.</p>
              </div>
            )}

            {activeTab === "scenarios" && (
              <div className="scenariosTab">
                {scenarios.length > 0 ? (
                  <div className="scenariosList">
                    {scenarios.map(scenario => (
                      <div 
                        key={scenario.scenario_id} 
                        className="scenarioItem"
                        onClick={() => navigate(`/scenarios/detail/${scenario.scenario_id}`)}
                      >
                        <h4>{scenario.name}</h4>
                        <p>Взнос: {formatCurrency(scenario.monthly_contribution)} ₽</p>
                        <p>Доходность: {scenario.expected_return}%</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="emptyState">
                    <p>Сценариев пока нет</p>
                    <button 
                      onClick={() => navigate(`/scenarios/new/${goalId}`)}
                      className="createButton"
                    >
                      Создать сценарий
                    </button>
                  </div>
                )}
              </div>
            )}

            {activeTab === "payments" && (
              <div className="paymentsTab">
                {payments.length > 0 ? (
                  <table className="paymentsTable">
                    <thead>
                      <tr>
                        <th>Дата</th>
                        <th>Сумма</th>
                        <th>Описание</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payments.map(payment => (
                        <tr key={payment.payment_id}>
                          <td>{formatDate(payment.payment_date)}</td>
                          <td>{formatCurrency(payment.amount)} ₽</td>
                          <td>{payment.description || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="emptyState">
                    <p>Платежей пока нет</p>
                    <button 
                      onClick={() => navigate(`/goals/${goalId}/payments`)}
                      className="createButton"
                    >
                      Добавить платеж
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Кнопки навигации */}
        <div className="navigationButtons">
          <button onClick={() => navigate("/goals")} className="navButton">
            ← Все цели
          </button>
          <button onClick={() => navigate(`/forecast/${goalId}`)} className="navButton primary">
            🔮 Прогноз
          </button>
        </div>
      </div>
    </Layout>
  );
}

export default GoalDetailPage;