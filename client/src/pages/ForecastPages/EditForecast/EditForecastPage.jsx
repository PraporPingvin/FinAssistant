import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Calendar, Target, CreditCard, ChevronLeft, Save, X } from "lucide-react";
import Layout from "../../components/Layout";
import { getGoal, updateGoal } from "../../api/api";
import "./EditForecastPage.css";

function EditForecastPage() {
  const { goalId } = useParams();
  const navigate = useNavigate();
  
  const [goal, setGoal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  
  const [forecastData, setForecastData] = useState({
    predicted_finish_date: "",
    target_amount: "",
    monthly_contribution: ""
  });

  useEffect(() => {
    if (goalId) {
      loadGoalData();
    }
  }, [goalId]);

  const loadGoalData = async () => {
    try {
      const goalData = await getGoal(goalId);
      setGoal(goalData);
      
      setForecastData({
        predicted_finish_date: goalData.deadline_date 
          ? new Date(goalData.deadline_date).toISOString().split('T')[0]
          : "",
        target_amount: goalData.target_amount,
        monthly_contribution: goalData.monthly_contribution
      });
      
    } catch (error) {
      console.error("Ошибка загрузки цели:", error);
      setError("Не удалось загрузить данные цели");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForecastData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setSaving(true);
      
      const updates = {
        deadline_date: forecastData.predicted_finish_date || null,
        target_amount: parseFloat(forecastData.target_amount),
        monthly_contribution: parseFloat(forecastData.monthly_contribution)
      };
      
      await updateGoal(goalId, updates);
      navigate(`/forecast/${goalId}`);
      
    } catch (error) {
      console.error("Ошибка обновления прогноза:", error);
      setError(`Ошибка: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (amount) => {
    const num = parseFloat(amount) || 0;
    return new Intl.NumberFormat('ru-RU').format(num);
  };

  if (loading) {
    return (
      <Layout>
        <div className="loadingContainer">
          <div className="loadingSpinner" />
          <p>Загружаем данные...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="editForecastPage">
        <button onClick={() => navigate(-1)} className="backButtonNav">
          <ChevronLeft size={18} />
          Назад
        </button>

        <div className="pageHeaderEditForecast">
          <h1>Редактирование прогноза</h1>
          <p>Настройте параметры прогноза достижения цели</p>
        </div>

        {goal && (
          <div className="goalInfo">
            <h2>{goal.title}</h2>
            <div className="goalProgress">
              <span>Прогресс:</span>
              <strong>{Math.round((goal.current_amount / goal.target_amount) * 100)}%</strong>
              <span className="separator">•</span>
              <span>{formatCurrency(goal.current_amount)} / {formatCurrency(goal.target_amount)} ₽</span>
            </div>
          </div>
        )}

        {error && (
          <div className="errorMessage">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="forecastForm">
          <div className="formGroup">
            <label>
              <Calendar size={16} />
              Желаемая дата завершения
            </label>
            <input
              type="date"
              name="predicted_finish_date"
              value={forecastData.predicted_finish_date}
              onChange={handleChange}
              min={new Date().toISOString().split('T')[0]}
              className="formInput"
            />
          </div>

          <div className="formGroup">
            <label>
              <Target size={16} />
              Целевая сумма (₽)
            </label>
            <input
              type="number"
              name="target_amount"
              value={forecastData.target_amount}
              onChange={handleChange}
              min="0"
              step="1000"
              className="formInput"
              required
            />
          </div>

          <div className="formGroup">
            <label>
              <CreditCard size={16} />
              Ежемесячный взнос (₽)
            </label>
            <input
              type="number"
              name="monthly_contribution"
              value={forecastData.monthly_contribution}
              onChange={handleChange}
              min="0"
              step="1000"
              className="formInput"
              required
            />
          </div>

          <div className="formButtons">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="cancelButton"
              disabled={saving}
            >
              <X size={16} />
              Отмена
            </button>
            <button
              type="submit"
              className="submitButton"
              disabled={saving}
            >
              <Save size={16} />
              {saving ? "Сохранение..." : "Сохранить прогноз"}
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
}

export default EditForecastPage;