import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
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
      
      // Заполняем форму текущими данными
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
      alert("Прогноз успешно обновлен!");
      navigate(`/forecast/${goalId}`);
      
    } catch (error) {
      console.error("Ошибка обновления прогноза:", error);
      alert(`Ошибка: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="loadingContainer">
          <div className="loadingSpinner"></div>
          <p>Загружаем данные...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="editForecastContainer">
        <div className="pageHeader">
          <h1>Редактирование прогноза</h1>
          <p>Настройте параметры прогноза достижения цели</p>
        </div>
        
        {goal && (
          <div className="goalInfo">
            <h3>Цель: {goal.title}</h3>
            <p>Текущий прогресс: {Math.round((goal.current_amount / goal.target_amount) * 100)}%</p>
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="forecastForm">
          <div className="formGroup">
            <label>Желаемая дата завершения</label>
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
            <label>Целевая сумма (₽)</label>
            <input
              type="number"
              name="target_amount"
              value={forecastData.target_amount}
              onChange={handleChange}
              min="0"
              step="1000"
              className="formInput"
            />
          </div>
          
          <div className="formGroup">
            <label>Ежемесячный взнос (₽)</label>
            <input
              type="number"
              name="monthly_contribution"
              value={forecastData.monthly_contribution}
              onChange={handleChange}
              min="0"
              step="1000"
              className="formInput"
            />
          </div>
          
          <div className="formButtons">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="cancelButton"
              disabled={saving}
            >
              Отмена
            </button>
            <button
              type="submit"
              className="submitButton"
              disabled={saving}
            >
              {saving ? "Сохранение..." : "Сохранить прогноз"}
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
}

export default EditForecastPage;