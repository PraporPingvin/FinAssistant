import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../../../components/Layout";
import { createGoal } from "../../../api/api";
import "./CreateGoalPage.css";

function CreateGoalPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    title: "",
    target_amount: "",
    monthly_contribution: "",
    initial_amount: "",
    start_date: new Date().toISOString().split("T")[0],
    deadline_date: "",
    description: "",
  });
  
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Форматирование числовых полей
    if (["target_amount", "monthly_contribution", "initial_amount"].includes(name)) {
      const numericValue = value.replace(/[^\d]/g, '');
      setFormData(prev => ({
        ...prev,
        [name]: numericValue
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
    
    // Очищаем ошибку при изменении
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ""
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.title.trim()) {
      newErrors.title = "Введите название цели";
    }
    
    if (!formData.target_amount || parseFloat(formData.target_amount) <= 0) {
      newErrors.target_amount = "Введите корректную сумму";
    }
    
    if (!formData.monthly_contribution || parseFloat(formData.monthly_contribution) <= 0) {
      newErrors.monthly_contribution = "Введите корректный ежемесячный взнос";
    }
    
    if (!formData.start_date) {
      newErrors.start_date = "Выберите дату начала";
    }
    
    if (formData.deadline_date && new Date(formData.deadline_date) <= new Date(formData.start_date)) {
      newErrors.deadline_date = "Дата завершения должна быть позже даты начала";
    }
    
    return newErrors;
  };

  const formatCurrency = (value) => {
    if (!value) return "0";
    const num = parseFloat(value);
    return new Intl.NumberFormat("ru-RU").format(num);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    
    setLoading(true);
    setErrors({});
    
    try {
      const goalData = {
        user_id: 1,
        title: formData.title,
        target_amount: parseFloat(formData.target_amount),
        monthly_contribution: parseFloat(formData.monthly_contribution),
        initial_amount: parseFloat(formData.initial_amount) || 0,
        start_date: formData.start_date,
        deadline_date: formData.deadline_date || null,
        status: "active"
      };
      
      await createGoal(goalData);
      setSuccess(true);
      
      setTimeout(() => {
        navigate("/goals");
      }, 2000);
      
    } catch (error) {
      console.error("Ошибка создания цели:", error);
      setErrors({
        submit: `Ошибка при создании цели: ${error.message}`
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigate("/goals");
  };

  return (
    <Layout>
      {loading && (
        <div className="loadingOverlay">
          <div className="loadingSpinner"></div>
          <div className="loadingText">Создание цели...</div>
        </div>
      )}
      
      <div className="createGoalContainer">
        <div className="createGoalHeader">
          <h1 className="createGoalTitle">Создание новой цели</h1>
          <p className="createGoalSubtitle">
            Заполните информацию о вашей финансовой цели
          </p>
        </div>
        
        {success && (
          <div className="successMessage">
            ✅ Цель успешно создана! Перенаправляем на страницу целей...
          </div>
        )}
        
        {errors.submit && (
          <div className="errorMessage">
            ❌ {errors.submit}
          </div>
        )}
        
        <div className="createGoalForm">
          <form onSubmit={handleSubmit}>
            {/* Название цели */}
            <div className="formGroup">
              <label htmlFor="title" className="formLabel">
                Название цели <span className="required">*</span>
              </label>
              <input
                id="title"
                name="title"
                type="text"
                placeholder="Например: Накопить на машину"
                value={formData.title}
                onChange={handleChange}
                className={`formInput ${errors.title ? 'formInputError' : ''}`}
                disabled={loading}
              />
              {errors.title && <div className="validationError">{errors.title}</div>}
            </div>
            
            {/* Целевая сумма и ежемесячный взнос */}
            <div className="formRow">
              <div className="formColumn">
                <label htmlFor="target_amount" className="formLabel">
                  Целевая сумма (₽) <span className="required">*</span>
                </label>
                <input
                  id="target_amount"
                  name="target_amount"
                  type="text"
                  placeholder="1000000"
                  value={formData.target_amount}
                  onChange={handleChange}
                  className={`formInput ${errors.target_amount ? 'formInputError' : ''}`}
                  disabled={loading}
                />
                {formData.target_amount && (
                  <div className="currencyPreview">
                    {formatCurrency(formData.target_amount)} ₽
                  </div>
                )}
                {errors.target_amount && <div className="validationError">{errors.target_amount}</div>}
              </div>
              
              <div className="formColumn">
                <label htmlFor="monthly_contribution" className="formLabel">
                  Ежемесячный взнос (₽) <span className="required">*</span>
                </label>
                <input
                  id="monthly_contribution"
                  name="monthly_contribution"
                  type="text"
                  placeholder="15000"
                  value={formData.monthly_contribution}
                  onChange={handleChange}
                  className={`formInput ${errors.monthly_contribution ? 'formInputError' : ''}`}
                  disabled={loading}
                />
                {formData.monthly_contribution && (
                  <div className="currencyPreview">
                    {formatCurrency(formData.monthly_contribution)} ₽ в месяц
                  </div>
                )}
                {errors.monthly_contribution && <div className="validationError">{errors.monthly_contribution}</div>}
              </div>
            </div>
            
            {/* Начальная сумма и дата начала */}
            <div className="formRow">
              <div className="formColumn">
                <label htmlFor="initial_amount" className="formLabel">
                  Начальная сумма (₽)
                </label>
                <input
                  id="initial_amount"
                  name="initial_amount"
                  type="text"
                  placeholder="50000"
                  value={formData.initial_amount}
                  onChange={handleChange}
                  className="formInput"
                  disabled={loading}
                />
                {formData.initial_amount && (
                  <div className="currencyPreview">
                    Уже есть: {formatCurrency(formData.initial_amount)} ₽
                  </div>
                )}
              </div>
              
              <div className="formColumn">
                <label htmlFor="start_date" className="formLabel">
                  Дата начала <span className="required">*</span>
                </label>
                <input
                  id="start_date"
                  name="start_date"
                  type="date"
                  value={formData.start_date}
                  onChange={handleChange}
                  className={`formInput ${errors.start_date ? 'formInputError' : ''}`}
                  disabled={loading}
                />
                {errors.start_date && <div className="validationError">{errors.start_date}</div>}
              </div>
            </div>
            
            {/* Дата завершения */}
            <div className="formGroup">
              <label htmlFor="deadline_date" className="formLabel">
                Желаемая дата завершения (опционально)
              </label>
              <input
                id="deadline_date"
                name="deadline_date"
                type="date"
                value={formData.deadline_date}
                onChange={handleChange}
                className={`formInput ${errors.deadline_date ? 'formInputError' : ''}`}
                min={formData.start_date}
                disabled={loading}
              />
              {errors.deadline_date && <div className="validationError">{errors.deadline_date}</div>}
            </div>
            
            {/* Описание */}
            <div className="formGroup">
              <label htmlFor="description" className="formLabel">
                Описание цели (опционально)
              </label>
              <textarea
                id="description"
                name="description"
                placeholder="Опишите детали вашей цели..."
                value={formData.description}
                onChange={handleChange}
                className="formTextarea"
                disabled={loading}
              />
            </div>
            
            {/* Кнопки */}
            <div className="formButtons">
              <button
                type="button"
                onClick={handleCancel}
                className="formButton cancelButton"
                disabled={loading}
              >
                Отмена
              </button>
              <button
                type="submit"
                disabled={loading}
                className="formButton submitButton"
              >
                {loading ? "Создание..." : "Создать цель"}
              </button>
            </div>
          </form>
        </div>
        
      </div>
    </Layout>
  );
}

export default CreateGoalPage;