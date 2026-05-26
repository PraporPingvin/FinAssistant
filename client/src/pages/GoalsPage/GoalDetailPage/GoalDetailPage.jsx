// client/src/pages/GoalsPage/GoalDetailPage/GoalDetailPage.jsx

import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import Layout from "../../../components/Layout";
import { getGoal, deleteGoal } from "../../../api/api";  // ← ДОБАВЬТЕ deleteGoal
import "./GoalDetailPage.css";

function GoalDetailPage() {
  const { goalId } = useParams();
  const navigate = useNavigate();
  
  const [goal, setGoal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (goalId) {
      loadGoal();
    }
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
      await deleteGoal(goalId);  // ← ТЕПЕРЬ ФУНКЦИЯ СУЩЕСТВУЕТ
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
    const num = parseFloat(amount) || 0;
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(num);
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
    return Math.min(100, Math.round((parseFloat(goal.current_amount || 0) / parseFloat(goal.target_amount)) * 100));
  };

  if (loading) {
    return (
      <Layout>
        <div className="loadingContainer">
          <div className="loadingAnimation"></div>
          <p>Загрузка данных цели...</p>
        </div>
      </Layout>
    );
  }

  if (error || !goal) {
    return (
      <Layout>
        <div className="errorContainer">
          <div className="errorMessage">
            <strong>❌ Ошибка:</strong> {error || "Цель не найдена"}
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
      <div className="goalDetailContainer">
        {/* Хлебные крошки */}
        <div className="breadcrumb">
          <Link to="/">🏠 Главная</Link>
          <span className="separator">›</span>
          <Link to="/goals">🎯 Цели</Link>
          <span className="separator">›</span>
          <span className="current">{goal.title}</span>
        </div>

        {/* Заголовок */}
        <div className="detailHeader">
          <div className="headerLeft">
            <h1>{goal.title}</h1>
            <span className={`statusBadge ${goal.status}`}>
              {goal.status === 'active' ? 'Активна' : 'Завершена'}
            </span>
          </div>
          <div className="headerActions">
            <Link to={`/goals/${goalId}/edit`} className="editButton">
              ✏️ Редактировать
            </Link>
            <button 
              onClick={() => setShowDeleteConfirm(true)} 
              className="deleteButton"
            >
              🗑️ Удалить
            </button>
          </div>
        </div>

        {/* Прогресс */}
        <div className="progressSection">
          <div className="progressHeader">
            <span>Прогресс достижения</span>
            <span className="progressPercent">{calculateProgress()}%</span>
          </div>
          <div className="progressBar">
            <div className="progressFill" style={{ width: `${calculateProgress()}%` }} />
          </div>
          <div className="progressStats">
            <div className="statItem">
              <span className="statLabel">Накоплено:</span>
              <span className="statValue">{formatCurrency(goal.current_amount || 0)}</span>
            </div>
            <div className="statItem">
              <span className="statLabel">Цель:</span>
              <span className="statValue highlight">{formatCurrency(goal.target_amount)}</span>
            </div>
            <div className="statItem">
              <span className="statLabel">Осталось:</span>
              <span className="statValue">
                {formatCurrency(Math.max(0, parseFloat(goal.target_amount) - parseFloat(goal.current_amount || 0)))}
              </span>
            </div>
          </div>
        </div>

        {/* Информация */}
        <div className="infoGrid">
          <div className="infoCard">
            <div className="infoIcon">💰</div>
            <div className="infoContent">
              <div className="infoLabel">Ежемесячный взнос</div>
              <div className="infoValue">{formatCurrency(goal.monthly_contribution)}/мес</div>
            </div>
          </div>

          <div className="infoCard">
            <div className="infoIcon">📅</div>
            <div className="infoContent">
              <div className="infoLabel">Дата начала</div>
              <div className="infoValue">{formatDate(goal.start_date)}</div>
            </div>
          </div>

          <div className="infoCard">
            <div className="infoIcon">🎯</div>
            <div className="infoContent">
              <div className="infoLabel">Дедлайн</div>
              <div className="infoValue">{goal.deadline_date ? formatDate(goal.deadline_date) : "Не установлен"}</div>
            </div>
          </div>

          <div className="infoCard">
            <div className="infoIcon">📈</div>
            <div className="infoContent">
              <div className="infoLabel">Стартовая сумма</div>
              <div className="infoValue">{formatCurrency(goal.initial_amount || 0)}</div>
            </div>
          </div>
        </div>

        {/* Кнопки действий */}
        <div className="actionButtons">
          <Link to={`/goals/${goalId}/payments`} className="actionButton primary">
            💳 Управление платежами
          </Link>
          <Link to={`/scenarios/${goalId}`} className="actionButton secondary">
            📈 Сценарии достижения
          </Link>
          <Link to={`/forecast/${goalId}`} className="actionButton secondary">
            🔮 Прогноз
          </Link>
        </div>

        {/* Модальное окно подтверждения удаления */}
        {showDeleteConfirm && (
          <div className="modalOverlay">
            <div className="modalContent">
              <div className="modalHeader">
                <h3>Подтверждение удаления</h3>
                <button className="closeButton" onClick={() => setShowDeleteConfirm(false)}>×</button>
              </div>
              <div className="modalBody">
                <p>Вы действительно хотите удалить цель <strong>"{goal.title}"</strong>?</p>
                <p className="warningText">Это действие нельзя отменить. Все платежи и сценарии также будут удалены.</p>
              </div>
              <div className="modalFooter">
                <button 
                  className="cancelButton" 
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={deleting}
                >
                  Отмена
                </button>
                <button 
                  className="confirmDeleteButton" 
                  onClick={handleDeleteGoal}
                  disabled={deleting}
                >
                  {deleting ? "Удаление..." : "Да, удалить"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

export default GoalDetailPage;