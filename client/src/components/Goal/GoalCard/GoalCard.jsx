// src/components/Goal/GoalCard/GoalCard.jsx
import React from "react";
import { useNavigate } from "react-router-dom";
import "./GoalCard.css";

function GoalCard({ goal }) {
  const navigate = useNavigate();

  const handleCardClick = () => {
    // При клике на карточку переходим на страницу деталей цели
    navigate(`/goals/${goal.goal_id}`);
  };

  const handleEditClick = (e) => {
    e.stopPropagation();
    navigate(`/goals/${goal.goal_id}/edit`); // Этот путь должен совпадать с маршрутом
  };

  const handlePaymentsClick = (e) => {
    e.stopPropagation(); // Предотвращаем всплытие события к карточке
    navigate(`/goals/${goal.goal_id}/payments`);
  };

  const handleScenariosClick = (e) => {
    e.stopPropagation();
    navigate(`/scenarios/${goal.goal_id}`);
  };

  const formatCurrency = (amount) => {
    const num = parseFloat(amount) || 0;
    return new Intl.NumberFormat('ru-RU').format(num);
  };

  const calculateProgress = () => {
    const target = parseFloat(goal.target_amount) || 1;
    const current = parseFloat(goal.current_amount) || 0;
    return Math.min(Math.round((current / target) * 100), 100);
  };

  const getStatusText = (status) => {
    switch (status) {
      case "active": return "Активна";
      case "completed": return "Выполнена";
      case "paused": return "Приостановлена";
      default: return status;
    }
  };

  const progress = calculateProgress();
  const remaining = (parseFloat(goal.target_amount) - parseFloat(goal.current_amount)) || 0;

  return (
    <div className="goal-card" onClick={handleCardClick}>
      <div className="goal-card-header">
        <h3 className="goal-card-title">{goal.title}</h3>
        <span className={`goal-card-status status-${goal.status}`}>
          {getStatusText(goal.status)}
        </span>
      </div>

      <div className="goal-card-content">
        <div className="goal-card-stats">
          <div className="goal-stat">
            <span className="stat-label">Цель:</span>
            <span className="stat-value">{formatCurrency(goal.target_amount)} ₽</span>
          </div>
          <div className="goal-stat">
            <span className="stat-label">Накоплено:</span>
            <span className="stat-value">{formatCurrency(goal.current_amount)} ₽</span>
          </div>
          <div className="goal-stat">
            <span className="stat-label">Осталось:</span>
            <span className="stat-value highlight">{formatCurrency(remaining)} ₽</span>
          </div>
          <div className="goal-stat">
            <span className="stat-label">Взнос:</span>
            <span className="stat-value">{formatCurrency(goal.monthly_contribution)} ₽/мес</span>
          </div>
        </div>

        <div className="goal-card-progress">
          <div className="progress-label">
            <span>Прогресс</span>
            <span>{progress}%</span>
          </div>
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {goal.deadline_date && (
          <div className="goal-deadline">
            📅 Срок: {new Date(goal.deadline_date).toLocaleDateString('ru-RU')}
          </div>
        )}
      </div>

      <div className="goal-card-actions">
        <button
          className="card-action-button edit-button"
          onClick={handleEditClick}
          title="Редактировать цель"
        >
          ✏️
        </button>
        <button
          className="card-action-button payments-button"
          onClick={handlePaymentsClick}
          title="Платежи"
        >
          💳
        </button>
        <button
          className="card-action-button scenarios-button"
          onClick={handleScenariosClick}
          title="Сценарии"
        >
          📈
        </button>
        <button
          className="card-action-button details-button"
          onClick={handleCardClick}
          title="Подробнее"
        >
          👁️
        </button>
      </div>
    </div>
  );
}

export default GoalCard;