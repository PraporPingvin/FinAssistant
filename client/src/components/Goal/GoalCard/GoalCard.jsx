import React from "react";
import { useNavigate } from "react-router-dom";
import {
  Pencil,
  CreditCard,
  LineChart,
  Eye,
  Calendar,
} from "lucide-react";
import "./GoalCard.css";

function GoalCard({ goal }) {
  const navigate = useNavigate();

  const handleCardClick = () => {
    navigate(`/goals/${goal.goal_id}`);
  };

  const handleEditClick = (e) => {
    e.stopPropagation();
    navigate(`/goals/${goal.goal_id}/edit`);
  };

  const handlePaymentsClick = (e) => {
    e.stopPropagation();
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
    <div className="goalCard" onClick={handleCardClick}>
      <div className="goalCardHeader">
        <h3 className="goalCardTitle">{goal.title}</h3>
        <span className={`goalCardStatus status-${goal.status}`}>
          {getStatusText(goal.status)}
        </span>
      </div>

      <div className="goalCardContent">
        <div className="goalCardStats">
          <div className="goalStatCard">
            <span className="statLabel">Цель:</span>
            <span className="statValue">{formatCurrency(goal.target_amount)} ₽</span>
          </div>
          <div className="goalStatCard">
            <span className="statLabel">Накоплено:</span>
            <span className="statValue">{formatCurrency(goal.current_amount)} ₽</span>
          </div>
          <div className="goalStatCard">
            <span className="statLabel">Осталось:</span>
            <span className="statValue highlight">{formatCurrency(remaining)} ₽</span>
          </div>
          <div className="goalStatCard">
            <span className="statLabel">Взнос:</span>
            <span className="statValue">{formatCurrency(goal.monthly_contribution)} ₽/мес</span>
          </div>
        </div>

        <div className="goalCardProgress">
          <div className="progressLabel">
            <span>Прогресс</span>
            <span>{progress}%</span>
          </div>
          <div className="progressBar">
            <div
              className="progressFill"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {goal.deadline_date && (
          <div className="goalDeadline">
            <Calendar size={14} />
            <span>Срок: {new Date(goal.deadline_date).toLocaleDateString('ru-RU')}</span>
          </div>
        )}
      </div>

      <div className="goalCardActions">
        <button
          className="cardActionButton"
          onClick={handleEditClick}
          title="Редактировать цель"
        >
          <Pencil size={16} />
        </button>
        <button
          className="cardActionButton"
          onClick={handlePaymentsClick}
          title="Платежи"
        >
          <CreditCard size={16} />
        </button>
        <button
          className="cardActionButton"
          onClick={handleScenariosClick}
          title="Сценарии"
        >
          <LineChart size={16} />
        </button>
        <button
          className="cardActionButton"
          onClick={handleCardClick}
          title="Подробнее"
        >
          <Eye size={16} />
        </button>
      </div>
    </div>
  );
}

export default GoalCard;