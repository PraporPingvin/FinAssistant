import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Layout from "../../../components/Layout";
import { getScenario, updateScenario, getGoal } from "../../../api/api";
import "./EditScenarioPage.css";

function EditScenarioPage() {
  const { scenarioId } = useParams();
  const navigate = useNavigate();
  
  const [scenario, setScenario] = useState(null);
  const [goal, setGoal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [useMockData, setUseMockData] = useState(false);
  
  const [formData, setFormData] = useState({
    name: "",
    monthly_contribution: "",
    expected_return: "7.5",
    inflation_rate: "6.0",
    target_amount: "",
    description: "",
  });

  useEffect(() => {
    if (scenarioId) {
      loadData();
    }
  }, [scenarioId]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError("");
      
      // Сначала пытаемся загрузить сценарий из API
      let scenarioData;
      try {
        scenarioData = await getScenario(scenarioId);
        
        // Проверяем, что данные корректные
        if (!scenarioData || !scenarioData.name) {
          throw new Error("Некорректные данные сценария");
        }
        
      } catch (apiError) {
        console.warn("Не удалось загрузить сценарий из API, используем mock-данные:", apiError);
        
        // Используем mock-данные для разработки
        scenarioData = {
          scenario_id: scenarioId,
          goal_id: 1,
          name: `Сценарий ${scenarioId}`,
          monthly_contribution: 15000,
          expected_return: 7.5,
          inflation_rate: 6.0,
          target_amount: 1000000,
          description: "Описание сценария",
          created_at: new Date().toISOString()
        };
        setUseMockData(true);
      }
      
      setScenario(scenarioData);
      
      // Заполняем форму данными
      setFormData({
        name: scenarioData.name || "",
        monthly_contribution: scenarioData.monthly_contribution || "",
        expected_return: scenarioData.expected_return || "7.5",
        inflation_rate: scenarioData.inflation_rate || "6.0",
        target_amount: scenarioData.target_amount || "",
        description: scenarioData.description || "",
      });
      
      // Загружаем цель
      try {
        const goalData = await getGoal(scenarioData.goal_id);
        setGoal(goalData);
      } catch (goalError) {
        console.warn("Не удалось загрузить цель:", goalError);
        setGoal({
          goal_id: scenarioData.goal_id,
          title: "Тестовая цель",
          target_amount: 1000000,
          current_amount: 250000,
          status: "active"
        });
      }
      
    } catch (error) {
      console.error("Ошибка загрузки данных:", error);
      setError(`Не удалось загрузить данные: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Форматирование числовых полей
    if (["monthly_contribution", "expected_return", "inflation_rate", "target_amount"].includes(name)) {
      const numericValue = value.replace(/[^\d.]/g, '');
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
  };

  const validateForm = () => {
    const errors = {};
    
    if (!formData.name.trim()) {
      errors.name = "Введите название сценария";
    }
    
    if (!formData.monthly_contribution || parseFloat(formData.monthly_contribution) <= 0) {
      errors.monthly_contribution = "Введите корректный ежемесячный взнос";
    }
    
    if (!formData.expected_return || parseFloat(formData.expected_return) < 0) {
      errors.expected_return = "Введите корректную доходность";
    }
    
    if (!formData.inflation_rate || parseFloat(formData.inflation_rate) < 0) {
      errors.inflation_rate = "Введите корректную инфляцию";
    }
    
    if (!formData.target_amount || parseFloat(formData.target_amount) <= 0) {
      errors.target_amount = "Введите корректную целевую сумму";
    }
    
    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      alert("Пожалуйста, исправьте ошибки в форме");
      return;
    }
    
    try {
      setSaving(true);
      
      const updates = {
        name: formData.name.trim(),
        monthly_contribution: parseFloat(formData.monthly_contribution),
        expected_return: parseFloat(formData.expected_return),
        inflation_rate: parseFloat(formData.inflation_rate),
        target_amount: parseFloat(formData.target_amount)
      };
      
      if (useMockData) {
        // Для mock-данных просто показываем сообщение
        console.log("Обновляем mock-данные:", updates);
        alert("В демо-режиме данные не сохраняются на сервере");
        navigate(`/scenarios/detail/${scenarioId}`);
      } else {
        // Реальный запрос к API
        const updatedScenario = await updateScenario(scenarioId, updates);
        setScenario(updatedScenario);
        alert("Сценарий успешно обновлен!");
        navigate(`/scenarios/detail/${scenarioId}`);
      }
      
    } catch (error) {
      console.error("Ошибка обновления сценария:", error);
      
      if (error.message.includes("Сценарий с таким названием уже существует")) {
        alert("Сценарий с таким названием уже существует для этой цели. Пожалуйста, выберите другое название.");
      } else {
        alert(`Ошибка обновления сценария: ${error.message}`);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (window.confirm("Отменить изменения? Все несохраненные данные будут потеряны.")) {
      navigate(-1);
    }
  };

  const formatCurrency = (value) => {
    if (!value) return "0";
    const num = parseFloat(value);
    return new Intl.NumberFormat("ru-RU").format(num);
  };

  const calculateMonthsToGoal = () => {
    if (!goal || !formData.monthly_contribution) return 0;
    
    const target = parseFloat(formData.target_amount) || parseFloat(goal.target_amount) || 0;
    const current = parseFloat(goal.current_amount) || 0;
    const monthly = parseFloat(formData.monthly_contribution) || 0;
    
    if (monthly <= 0) return 0;
    
    const remaining = target - current;
    return Math.ceil(remaining / monthly);
  };

  const calculateRiskLevel = (expectedReturn) => {
    const returnValue = parseFloat(expectedReturn) || 0;
    if (returnValue < 5) return { level: "Низкий", color: "#4caf50" };
    if (returnValue < 10) return { level: "Средний", color: "#ff9800" };
    return { level: "Высокий", color: "#f44336" };
  };

  if (loading) {
    return (
      <Layout>
        <div className="loadingContainer">
          <div className="loadingSpinner"></div>
          <p>Загружаем данные сценария...</p>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="editScenarioContainer">
          <div className="errorMessage">
            <strong>Внимание:</strong> {error}
          </div>
          <button onClick={() => navigate(-1)} className="backButton">
            ← Назад
          </button>
        </div>
      </Layout>
    );
  }

  const monthsToGoal = calculateMonthsToGoal();
  const risk = calculateRiskLevel(formData.expected_return);
  const effectiveReturn = (parseFloat(formData.expected_return) - parseFloat(formData.inflation_rate)).toFixed(1);

  return (
    <Layout>
      <div className="editScenarioContainer">
        {/* Хлебные крошки */}
        <div className="breadcrumb">
          <span onClick={() => navigate("/")} style={{cursor: "pointer", color: "#495631"}}>Главная</span>
          {" > "}
          <span onClick={() => navigate("/goals")} style={{cursor: "pointer", color: "#495631"}}>Цели</span>
          {" > "}
          {goal && (
            <>
              <span onClick={() => navigate(`/goals/${goal.goal_id}`)} style={{cursor: "pointer", color: "#495631"}}>
                {goal.title}
              </span>
              {" > "}
            </>
          )}
          <span onClick={() => navigate(`/scenarios/${scenario?.goal_id}`)} style={{cursor: "pointer", color: "#495631"}}>
            Сценарии
          </span>
          {" > "}
          {scenario && (
            <span onClick={() => navigate(`/scenarios/detail/${scenarioId}`)} style={{cursor: "pointer", color: "#495631"}}>
              {scenario.name}
            </span>
          )}
          {" > "}
          <span>Редактирование</span>
        </div>

        {/* Заголовок */}
        <div className="pageHeaderEdit">
          <h1>Редактирование сценария</h1>
          <p className="subtitle">
            {scenario ? `Изменение параметров сценария "${scenario.name}"` : "Редактирование сценария"}
          </p>
          {useMockData && (
            <div className="demoWarning">
              ⚠️ Работаем в демо-режиме. Данные не сохраняются на сервере.
            </div>
          )}
        </div>

        {/* Информация о цели */}
        {goal && (
          <div className="goalInfo">
            <h3>🎯 Цель: {goal.title}</h3>
            <div className="goalStatsEdit">
              <div className="goalStat">
                <span>Целевая сумма:</span>
                <strong>{formatCurrency(goal.target_amount)} ₽</strong>
              </div>
              <div className="goalStat">
                <span>Текущий прогресс:</span>
                <strong>{formatCurrency(goal.current_amount)} ₽</strong>
              </div>
              <div className="goalStat">
                <span>Прогресс:</span>
                <strong>
                  {goal.target_amount > 0 
                    ? `${Math.round((parseFloat(goal.current_amount) / parseFloat(goal.target_amount)) * 100)}%`
                    : "0%"}
                </strong>
              </div>
            </div>
          </div>
        )}

        {/* Форма редактирования */}
        <div className="editFormContainer">
          <form onSubmit={handleSubmit} className="editForm">
            {/* Название сценария */}
            <div className="formGroup">
              <label className="formLabel">
                Название сценария *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Введите название сценария"
                className="formInput"
                required
              />
              {scenario && (
                <div className="inputHint">
                  Текущее название: <strong>{scenario.name}</strong>
                </div>
              )}
            </div>

            {/* Параметры */}
            <div className="formRow">
              <div className="formColumn">
                <label className="formLabel">
                  Ежемесячный взнос (₽) *
                </label>
                <input
                  type="text"
                  name="monthly_contribution"
                  value={formData.monthly_contribution}
                  onChange={handleChange}
                  placeholder="15000"
                  className="formInput"
                  required
                />
                {scenario && (
                  <div className="inputHint">
                    Текущее значение: <strong>{formatCurrency(scenario.monthly_contribution)} ₽</strong>
                  </div>
                )}
              </div>
            </div>

            <div className="formRow">
              <div className="formColumn">
                <label className="formLabel">
                  Ожидаемая доходность (%) *
                </label>
                <input
                  type="text"
                  name="expected_return"
                  value={formData.expected_return}
                  onChange={handleChange}
                  placeholder="7.5"
                  className="formInput"
                  required
                />
                {scenario && (
                  <div className="inputHint">
                    Текущее значение: <strong>{scenario.expected_return}%</strong>
                  </div>
                )}
              </div>

              <div className="formColumn">
                <label className="formLabel">
                  Ожидаемая инфляция (%) *
                </label>
                <input
                  type="text"
                  name="inflation_rate"
                  value={formData.inflation_rate}
                  onChange={handleChange}
                  placeholder="6.0"
                  className="formInput"
                  required
                />
                {scenario && (
                  <div className="inputHint">
                    Текущее значение: <strong>{scenario.inflation_rate}%</strong>
                  </div>
                )}
              </div>
            </div>

            <div className="formRow">
              <div className="formColumn">
                <label className="formLabel">
                  Целевая сумма (₽) *
                </label>
                <input
                  type="text"
                  name="target_amount"
                  value={formData.target_amount}
                  onChange={handleChange}
                  placeholder="1000000"
                  className="formInput"
                  required
                />
                {scenario && (
                  <div className="inputHint">
                    Текущее значение: <strong>{formatCurrency(scenario.target_amount)} ₽</strong>
                  </div>
                )}
              </div>
            </div>

            {/* Описание */}
            <div className="formGroup">
              <label className="formLabel">
                Описание сценария
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Опишите особенности этого сценария..."
                className="formTextarea"
                rows="4"
              />
              {scenario && (
                <div className="inputHint">
                  {scenario.description ? "Текущее описание" : "Описание отсутствует"}
                </div>
              )}
            </div>

            {/* Предварительный расчет */}
            {formData.monthly_contribution && formData.expected_return && (
              <div className="previewSection">
                <h4>Новый расчет</h4>
                <div className="previewGrid">
                  <div className="previewItem">
                    <span className="previewLabel">Срок достижения:</span>
                    <span className="previewValue">
                      {isFinite(monthsToGoal) ? (
                        <>
                          <strong>{monthsToGoal}</strong> месяцев
                          <small>({Math.floor(monthsToGoal / 12)} г. {monthsToGoal % 12} мес.)</small>
                        </>
                      ) : "Недостижимо"}
                    </span>
                  </div>
                  <div className="previewItem">
                    <span className="previewLabel">Уровень риска:</span>
                    <span className="previewValue" style={{ color: risk.color }}>
                      {risk.level}
                    </span>
                  </div>
                  <div className="previewItem">
                    <span className="previewLabel">Эффективная доходность:</span>
                    <span className="previewValue">
                      {effectiveReturn}%
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Кнопки действий */}
            <div className="actionButtons">
              <button
                type="button"
                onClick={handleCancel}
                className="actionButtonEdit cancelButtonEdit"
                disabled={saving}
              >
                Отмена
              </button>
              <button
                type="submit"
                className="actionButtonEdit saveButtonEdit"
                disabled={saving}
              >
                {saving ? (
                  <>
                    <span className="spinner"></span>
                    Сохранение...
                  </>
                ) : useMockData ? "Продолжить (демо)" : "Сохранить изменения"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  );
}

export default EditScenarioPage;