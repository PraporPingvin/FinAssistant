import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./GoalForm.css";

function GoalForm({ onSubmit, onCancel }) {
  const [form, setForm] = useState({
    title: "",
    target_amount: "",
    monthly_contribution: "",
    start_date: new Date().toISOString().split('T')[0],
    deadline_date: "",
  });
  const [errors, setErrors] = useState({});

  const navigate = useNavigate();

  const validateForm = () => {
    const newErrors = {};
    
    if (!form.title.trim()) {
      newErrors.title = "Введите название цели";
    }
    
    if (!form.target_amount || parseFloat(form.target_amount) <= 0) {
      newErrors.target_amount = "Введите корректную сумму";
    }
    
    if (!form.monthly_contribution || parseFloat(form.monthly_contribution) <= 0) {
      newErrors.monthly_contribution = "Введите корректный взнос";
    }
    
    if (!form.start_date) {
      newErrors.start_date = "Выберите дату начала";
    }
    
    if (form.deadline_date && new Date(form.deadline_date) <= new Date(form.start_date)) {
      newErrors.deadline_date = "Дата завершения должна быть позже даты начала";
    }
    
    return newErrors;
  };

  const handleChange = e => {
    const { name, value } = e.target;
    
    // Форматирование числовых полей
    if (name.includes("amount") || name.includes("contribution")) {
      const numericValue = value.replace(/[^\d]/g, '');
      setForm({ ...form, [name]: numericValue });
    } else {
      setForm({ ...form, [name]: value });
    }
    
    // Очищаем ошибку при изменении поля
    if (errors[name]) {
      setErrors({ ...errors, [name]: null });
    }
  };

  const formatCurrency = (value) => {
    if (!value) return "0";
    const num = parseFloat(value);
    return new Intl.NumberFormat('ru-RU').format(num);
  };

  const handleSubmit = async e => {
    e.preventDefault();
    
    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    
    const goalData = {
      ...form,
      user_id: 1,
      initial_amount: 0,
      target_amount: parseFloat(form.target_amount),
      monthly_contribution: parseFloat(form.monthly_contribution),
      status: "active"
    };
    
    if (onSubmit) {
      onSubmit(goalData);
    } else {
      try {
        // Импортируем API при необходимости
        const { createGoal } = await import("../../../api/api");
        await createGoal(goalData);
        alert("Цель создана");
        navigate("/goals");
      } catch (error) {
        console.error("Ошибка создания цели:", error);
        alert(`Ошибка создания цели: ${error.message}`);
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="goalForm">
      <h2 className="formTitle">Новая финансовая цель</h2>
      
      {/* Название цели */}
      <div className="formField">
        <label htmlFor="title" className="formLabel">
          Название цели <span className="required">*</span>
        </label>
        <input
          id="title"
          name="title"
          placeholder="Например: Накопить на машину"
          value={form.title}
          onChange={handleChange}
          className={`formInput ${errors.title ? 'formInputError' : ''}`}
        />
        {errors.title && <div className="formError">{errors.title}</div>}
      </div>
      
      {/* Целевая сумма */}
      <div className="formField">
        <label htmlFor="target_amount" className="formLabel">
          Целевая сумма (₽) <span className="required">*</span>
        </label>
        <input
          id="target_amount"
          name="target_amount"
          placeholder="500000"
          value={form.target_amount}
          onChange={handleChange}
          className={`formInput ${errors.target_amount ? 'formInputError' : ''}`}
        />
        {form.target_amount && (
          <div className="currencyPreview">
            {formatCurrency(form.target_amount)} ₽
          </div>
        )}
        {errors.target_amount && <div className="formError">{errors.target_amount}</div>}
      </div>
      
      {/* Ежемесячный взнос */}
      <div className="formField">
        <label htmlFor="monthly_contribution" className="formLabel">
          Ежемесячный взнос (₽) <span className="required">*</span>
        </label>
        <input
          id="monthly_contribution"
          name="monthly_contribution"
          placeholder="10000"
          value={form.monthly_contribution}
          onChange={handleChange}
          className={`formInput ${errors.monthly_contribution ? 'formInputError' : ''}`}
        />
        {form.monthly_contribution && (
          <div className="currencyPreview">
            {formatCurrency(form.monthly_contribution)} ₽ в месяц
          </div>
        )}
        {errors.monthly_contribution && <div className="formError">{errors.monthly_contribution}</div>}
      </div>
      
      {/* Даты */}
      <div className="formRow">
        <div className="formColumn">
          <label htmlFor="start_date" className="formLabel">
            Дата начала <span className="required">*</span>
          </label>
          <input
            id="start_date"
            name="start_date"
            type="date"
            value={form.start_date}
            onChange={handleChange}
            className={`formInput ${errors.start_date ? 'formInputError' : ''}`}
          />
          {errors.start_date && <div className="formError">{errors.start_date}</div>}
        </div>
        
        <div className="formColumn">
          <label htmlFor="deadline_date" className="formLabel">
            Желаемая дата завершения
          </label>
          <input
            id="deadline_date"
            name="deadline_date"
            type="date"
            value={form.deadline_date}
            onChange={handleChange}
            className={`formInput ${errors.deadline_date ? 'formInputError' : ''}`}
          />
          {errors.deadline_date && <div className="formError">{errors.deadline_date}</div>}
        </div>
      </div>
      
      {/* Кнопки */}
      <div className="formButtons">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="formButton cancelButton"
          >
            Отмена
          </button>
        )}
        <button
          type="submit"
          className="formButton submitButton"
        >
          Создать цель
        </button>
      </div>
    </form>
  );
}

export default GoalForm;