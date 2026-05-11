import React, { useState, useEffect } from "react";
import "./GoalDetailCard.css";

function GoalDetailCard({ goal, editMode, onUpdate }) {
  const [editData, setEditData] = useState({ ...goal });

  // Преобразование дат в формат YYYY-MM-DD для полей ввода
  const formatDateForInput = (dateString) => {
    if (!dateString) return "";
    try {
      const date = new Date(dateString);
      return date.toISOString().split('T')[0];
    } catch {
      return "";
    }
  };

  // Инициализация editData с правильным форматом дат
  useEffect(() => {
    if (goal) {
      setEditData({
        ...goal,
        start_date: formatDateForInput(goal.start_date),
        deadline_date: formatDateForInput(goal.deadline_date)
      });
    }
  }, [goal]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setEditData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (onUpdate) {
      onUpdate(editData);
    }
  };

  const handleCancel = () => {
    setEditData({
      ...goal,
      start_date: formatDateForInput(goal.start_date),
      deadline_date: formatDateForInput(goal.deadline_date)
    });
    if (onUpdate) {
      onUpdate(null);
    }
  };

  const formatCurrency = (amount) => {
    const num = parseFloat(amount) || 0;
    return new Intl.NumberFormat('ru-RU').format(num);
  };

  const formatDateForDisplay = (dateString) => {
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
    const target = parseFloat(goal.target_amount) || 0;
    const current = parseFloat(goal.current_amount) || 0;
    if (target === 0) return 0;
    const progress = Math.round((current / target) * 100);
    return Math.min(Math.max(progress, 0), 100);
  };

  const getStatusText = (status) => {
    switch (status) {
      case "active": return "В процессе";
      case "completed": return "Выполнена";
      case "paused": return "Приостановлена";
      default: return status;
    }
  };

  const getStatusClass = (status) => {
    switch (status) {
      case "active": return "statusBadge statusActive";
      case "completed": return "statusBadge statusCompleted";
      case "paused": return "statusBadge statusPaused";
      default: return "statusBadge";
    }
  };

  if (editMode) {
    return (
      <form onSubmit={handleSubmit} className="editForm">
        <div className="formGrid">
          <div className="formGroup">
            <label className="formLabel">Название цели</label>
            <input
              type="text"
              name="title"
              value={editData.title || ""}
              onChange={handleChange}
              className="formInput"
              required
            />
          </div>
          
          <div className="formGroup">
            <label className="formLabel">Статус</label>
            <select
              name="status"
              value={editData.status || "active"}
              onChange={handleChange}
              className="formSelect"
            >
              <option value="active">В процессе</option>
              <option value="paused">Приостановлена</option>
              <option value="completed">Выполнена</option>
            </select>
          </div>
          
          <div className="formGroup">
            <label className="formLabel">Целевая сумма (₽)</label>
            <input
              type="number"
              name="target_amount"
              value={editData.target_amount || ""}
              onChange={handleChange}
              className="formInput"
              required
              min="0"
              step="1000"
            />
          </div>
          
          <div className="formGroup">
            <label className="formLabel">Ежемесячный взнос (₽)</label>
            <input
              type="number"
              name="monthly_contribution"
              value={editData.monthly_contribution || ""}
              onChange={handleChange}
              className="formInput"
              required
              min="0"
              step="1000"
            />
          </div>
          
          <div className="formGroup">
            <label className="formLabel">Текущая сумма (₽)</label>
            <input
              type="number"
              name="current_amount"
              value={editData.current_amount || ""}
              onChange={handleChange}
              className="formInput"
              required
              min="0"
            />
          </div>
          
          <div className="formGroup">
            <label className="formLabel">Начальная сумма (₽)</label>
            <input
              type="number"
              name="initial_amount"
              value={editData.initial_amount || ""}
              onChange={handleChange}
              className="formInput"
              min="0"
            />
          </div>
          
          <div className="formGroup">
            <label className="formLabel">Дата начала</label>
            <input
              type="date"
              name="start_date"
              value={editData.start_date || ""}
              onChange={handleChange}
              className="formInput"
              required
            />
          </div>
          
          <div className="formGroup">
            <label className="formLabel">Дата завершения</label>
            <input
              type="date"
              name="deadline_date"
              value={editData.deadline_date || ""}
              onChange={handleChange}
              className="formInput"
              min={editData.start_date}
            />
          </div>
        </div>
        
        <div className="editButtons">
          <button
            type="button"
            onClick={handleCancel}
            className="editButton cancelButton"
          >
            Отмена
          </button>
          <button
            type="submit"
            className="editButton saveButton"
          >
            Сохранить изменения
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="goalDetailCard">
      {/* Прогресс бар */}
      <div className="progressContainer">
        <div className="progressBar">
          <div 
            className="progressFill" 
            style={{ width: `${calculateProgress()}%` }}
          />
        </div>
        <div className="progressText">
          <span className="progressPercent">{calculateProgress()}%</span>
          <span>
            {formatCurrency(goal.current_amount)} / {formatCurrency(goal.target_amount)}
            <span className="currency"> ₽</span>
          </span>
        </div>
      </div>
      
      {/* Детали цели */}
      <div className="detailsGrid">
        <div className="detailItem">
          <span className="detailLabel">Статус</span>
          <div>
            <span className={getStatusClass(goal.status)}>
              {getStatusText(goal.status)}
            </span>
          </div>
        </div>
        
        <div className="detailItem">
          <span className="detailLabel">Целевая сумма</span>
          <div className="detailValue">
            {formatCurrency(goal.target_amount)}
            <span className="currency"> ₽</span>
          </div>
        </div>
        
        <div className="detailItem">
          <span className="detailLabel">Текущая сумма</span>
          <div className="detailValue">
            {formatCurrency(goal.current_amount)}
            <span className="currency"> ₽</span>
          </div>
        </div>
        
        <div className="detailItem">
          <span className="detailLabel">Ежемесячный взнос</span>
          <div className="detailValue">
            {formatCurrency(goal.monthly_contribution)}
            <span className="currency"> ₽</span>
          </div>
        </div>
        
        <div className="detailItem">
          <span className="detailLabel">Начальная сумма</span>
          <div className="detailValue">
            {formatCurrency(goal.initial_amount)}
            <span className="currency"> ₽</span>
          </div>
        </div>
        
        <div className="detailItem">
          <span className="detailLabel">Дата начала</span>
          <div className="detailValue">{formatDateForDisplay(goal.start_date)}</div>
        </div>
        
        <div className="detailItem">
          <span className="detailLabel">Дата завершения</span>
          <div className="detailValue">{formatDateForDisplay(goal.deadline_date) || "—"}</div>
        </div>
        
        <div className="detailItem">
          <span className="detailLabel">Создана</span>
          <div className="detailValue">{formatDateForDisplay(goal.created_at)}</div>
        </div>
        
        <div className="detailItem">
          <span className="detailLabel">Обновлена</span>
          <div className="detailValue">{formatDateForDisplay(goal.updated_at)}</div>
        </div>
      </div>
    </div>
  );
}

export default GoalDetailCard;