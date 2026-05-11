import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Layout from "../../../components/Layout";
import { getGoal, updateGoal } from "../../../api/api";
import "./EditGoalPage.css";

function EditGoalPage() {
  const { goalId } = useParams();
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    title: "",
    target_amount: "",
    monthly_contribution: "",
    initial_amount: "",
    start_date: "",
    deadline_date: "",
    description: "",
    status: "active"
  });
  
  const [originalGoal, setOriginalGoal] = useState(null);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (goalId) {
      loadGoal();
    }
  }, [goalId]);

  const loadGoal = async () => {
    try {
      setLoading(true);
      const goalData = await getGoal(goalId);
      
      if (!goalData) {
        setError("Цель не найдена");
        return;
      }
      
      setOriginalGoal(goalData);
      setFormData({
        title: goalData.title || "",
        target_amount: goalData.target_amount || "",
        monthly_contribution: goalData.monthly_contribution || "",
        initial_amount: goalData.initial_amount || "0",
        start_date: goalData.start_date ? goalData.start_date.split('T')[0] : "",
        deadline_date: goalData.deadline_date ? goalData.deadline_date.split('T')[0] : "",
        description: goalData.description || "",
        status: goalData.status || "active"
      });
      
    } catch (err) {
      console.error("Ошибка загрузки цели:", err);
      setError(`Не удалось загрузить цель: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

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
    
    setSaving(true);
    setErrors({});
    
    try {
      const goalData = {
        title: formData.title,
        target_amount: parseFloat(formData.target_amount),
        monthly_contribution: parseFloat(formData.monthly_contribution),
        initial_amount: parseFloat(formData.initial_amount) || 0,
        start_date: formData.start_date,
        deadline_date: formData.deadline_date || null,
        status: formData.status
      };
      
      await updateGoal(goalId, goalData);
      alert("Цель успешно обновлена!");
      navigate(`/goals/${goalId}`);
      
    } catch (err) {
      console.error("Ошибка обновления цели:", err);
      setErrors({
        submit: `Ошибка при обновлении цели: ${err.message}`
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    navigate(`/goals/${goalId}`);
  };

  if (loading) {
    return (
      <Layout>
        <div className="loadingContainer">
          <div className="loadingSpinner"></div>
          <p>Загрузка данных цели...</p>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="errorContainer">
          <div className="errorMessage">{error}</div>
          <button onClick={() => navigate("/goals")} className="backButton">
            Вернуться к списку целей
          </button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="editGoalContainer">
        <div className="editGoalHeader">
          <h1>Редактирование цели</h1>
          <p className="editGoalSubtitle">
            Измените информацию о вашей финансовой цели
          </p>
        </div>
        
        {errors.submit && (
          <div className="errorMessage">
            ❌ {errors.submit}
          </div>
        )}
        
        <div className="editGoalForm">
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
                disabled={saving}
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
                  disabled={saving}
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
                  disabled={saving}
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
                  disabled={saving}
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
                  disabled={saving}
                />
                {errors.start_date && <div className="validationError">{errors.start_date}</div>}
              </div>
            </div>
            
            {/* Дата завершения и статус */}
            <div className="formRow">
              <div className="formColumn">
                <label htmlFor="deadline_date" className="formLabel">
                  Желаемая дата завершения
                </label>
                <input
                  id="deadline_date"
                  name="deadline_date"
                  type="date"
                  value={formData.deadline_date}
                  onChange={handleChange}
                  className={`formInput ${errors.deadline_date ? 'formInputError' : ''}`}
                  min={formData.start_date}
                  disabled={saving}
                />
                {errors.deadline_date && <div className="validationError">{errors.deadline_date}</div>}
              </div>
              
              <div className="formColumn">
                <label htmlFor="status" className="formLabel">
                  Статус цели
                </label>
                <select
                  id="status"
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="formInput"
                  disabled={saving}
                >
                  <option value="active">Активна</option>
                  <option value="paused">Приостановлена</option>
                  <option value="completed">Выполнена</option>
                </select>
              </div>
            </div>
            
            {/* Описание */}
            <div className="formGroup">
              <label htmlFor="description" className="formLabel">
                Описание цели
              </label>
              <textarea
                id="description"
                name="description"
                placeholder="Опишите детали вашей цели..."
                value={formData.description}
                onChange={handleChange}
                className="formTextarea"
                disabled={saving}
                rows="4"
              />
            </div>
            
            {/* Кнопки */}
            <div className="formButtons">
              <button
                type="button"
                onClick={handleCancel}
                className="formButton cancelButton"
                disabled={saving}
              >
                Отмена
              </button>
              <button
                type="submit"
                disabled={saving}
                className="formButton submitButton"
              >
                {saving ? "Сохранение..." : "Сохранить изменения"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  );
}

export default EditGoalPage;