import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  ArrowLeft,
  Save,
  X,
  Target,
  DollarSign,
  TrendingUp,
  Activity,
  Shield,
  Zap,
  AlertCircle,
  Edit2,
  Trash2,
} from "lucide-react";
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
      
      let scenarioData;
      try {
        scenarioData = await getScenario(scenarioId);
        
        if (!scenarioData || !scenarioData.name) {
          throw new Error("Некорректные данные сценария");
        }
      } catch (apiError) {
        console.warn("Используем mock-данные:", apiError);
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
      
      setFormData({
        name: scenarioData.name || "",
        monthly_contribution: scenarioData.monthly_contribution || "",
        expected_return: scenarioData.expected_return || "7.5",
        inflation_rate: scenarioData.inflation_rate || "6.0",
        target_amount: scenarioData.target_amount || "",
        description: scenarioData.description || "",
      });
      
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
    const errorsList = {};
    
    if (!formData.name.trim()) {
      errorsList.name = "Введите название сценария";
    }
    
    if (!formData.monthly_contribution || parseFloat(formData.monthly_contribution) <= 0) {
      errorsList.monthly_contribution = "Введите корректный ежемесячный взнос";
    }
    
    if (!formData.expected_return || parseFloat(formData.expected_return) < 0) {
      errorsList.expected_return = "Введите корректную доходность";
    }
    
    if (!formData.inflation_rate || parseFloat(formData.inflation_rate) < 0) {
      errorsList.inflation_rate = "Введите корректную инфляцию";
    }
    
    if (!formData.target_amount || parseFloat(formData.target_amount) <= 0) {
      errorsList.target_amount = "Введите корректную целевую сумму";
    }
    
    return errorsList;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      setError("Пожалуйста, исправьте ошибки в форме");
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
        console.log("Обновляем mock-данные:", updates);
        alert("В демо-режиме данные не сохраняются на сервере");
        navigate(`/scenarios/detail/${scenarioId}`);
      } else {
        await updateScenario(scenarioId, updates);
        navigate(`/scenarios/detail/${scenarioId}`);
      }
      
    } catch (error) {
      console.error("Ошибка обновления сценария:", error);
      
      if (error.message.includes("Сценарий с таким названием уже существует")) {
        setError("Сценарий с таким названием уже существует для этой цели. Пожалуйста, выберите другое название.");
      } else {
        setError(`Ошибка обновления сценария: ${error.message}`);
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
    if (returnValue < 5) return { level: "Низкий", color: "#2E7D32", icon: <Shield size={14} /> };
    if (returnValue < 10) return { level: "Средний", color: "#F5A623", icon: <Activity size={14} /> };
    return { level: "Высокий", color: "#E35D5D", icon: <Zap size={14} /> };
  };

  if (loading) {
    return (
      <Layout>
        <div className="loadingContainer">
          <div className="loadingSpinner" />
          <p>Загружаем данные сценария...</p>
        </div>
      </Layout>
    );
  }

  if (error && !scenario) {
    return (
      <Layout>
        <div className="editScenarioPage">
          <div className="errorCard">
            <AlertCircle size={48} />
            <h2>Ошибка</h2>
            <p>{error}</p>
            <button onClick={() => navigate(-1)} className="backButton">
              ← Назад
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  const monthsToGoal = calculateMonthsToGoal();
  const risk = calculateRiskLevel(formData.expected_return);
  const effectiveReturn = (parseFloat(formData.expected_return) - parseFloat(formData.inflation_rate)).toFixed(1);

  return (
    <Layout>
      <div className="editScenarioPage">
        <button onClick={() => navigate(-1)} className="backButtonNav">
          <ArrowLeft size={16} />
          Назад
        </button>

        <div className="pageHeaderEditScenario">
          <h1>Редактирование сценария</h1>
          <p>
            {scenario ? `Изменение параметров сценария "${scenario.name}"` : "Редактирование сценария"}
          </p>
          {useMockData && (
            <div className="demoWarning">
              <AlertCircle size={14} />
              Работаем в демо-режиме. Данные не сохраняются на сервере.
            </div>
          )}
        </div>

        {goal && (
          <div className="goalInfoCard">
            <div className="goalInfoHeader">
              <Target size={20} />
              <h3>{goal.title}</h3>
              <span className={`goalStatus status-${goal.status}`}>
                {goal.status === "active" ? "Активна" : goal.status === "completed" ? "Выполнена" : "Приостановлена"}
              </span>
            </div>
            <div className="goalInfoStatsEdit">
              <div className="stat">
                <span className="statLabel">Целевая сумма</span>
                <span className="statValue">{formatCurrency(goal.target_amount)} ₽</span>
              </div>
              <div className="stat">
                <span className="statLabel">Текущая сумма</span>
                <span className="statValue">{formatCurrency(goal.current_amount)} ₽</span>
              </div>
              <div className="stat">
                <span className="statLabel">Прогресс</span>
                <span className="statValue">
                  {goal.target_amount > 0 
                    ? `${Math.round((parseFloat(goal.current_amount) / parseFloat(goal.target_amount)) * 100)}%`
                    : "0%"}
                </span>
              </div>
            </div>
            <div className="progressBar">
              <div 
                className="progressFill" 
                style={{ width: `${Math.round((parseFloat(goal.current_amount) / parseFloat(goal.target_amount)) * 100)}%` }}
              />
            </div>
          </div>
        )}

        <div className="editFormContainer">
          <form onSubmit={handleSubmit} className="editForm">
            <div className="formGroup">
              <label className="formLabel">
                Название сценария <span className="required">*</span>
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

            <div className="formRow">
              <div className="formColumn">
                <label className="formLabel">
                  <DollarSign size={14} />
                  Ежемесячный взнос (₽) <span className="required">*</span>
                </label>
                <input
                  type="text"
                  name="monthly_contribution"
                  value={formData.monthly_contribution}
                  onChange={handleChange}
                  placeholder="15 000"
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
                  <TrendingUp size={14} />
                  Ожидаемая доходность (%) <span className="required">*</span>
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
                  <Activity size={14} />
                  Ожидаемая инфляция (%) <span className="required">*</span>
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
                  <Target size={14} />
                  Целевая сумма (₽) <span className="required">*</span>
                </label>
                <input
                  type="text"
                  name="target_amount"
                  value={formData.target_amount}
                  onChange={handleChange}
                  placeholder="1 000 000"
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

            <div className="formGroup">
              <label className="formLabel">Описание сценария</label>
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
                  {scenario.description ? "Текущее описание присутствует" : "Описание отсутствует"}
                </div>
              )}
            </div>

            {formData.monthly_contribution && formData.expected_return && (
              <div className="previewSection">
                <h4>Новый расчет</h4>
                <div className="previewGrid">
                  <div className="previewItem">
                    <span className="previewLabel">Срок достижения</span>
                    <strong className="previewValue">
                      {isFinite(monthsToGoal) && monthsToGoal > 0 ? `${monthsToGoal} мес.` : "Недостижимо"}
                    </strong>
                    {isFinite(monthsToGoal) && monthsToGoal > 0 && (
                      <small>({Math.floor(monthsToGoal / 12)} г. {monthsToGoal % 12} мес.)</small>
                    )}
                  </div>
                  <div className="previewItem">
                    <span className="previewLabel">Уровень риска</span>
                    <strong className="previewValue" style={{ color: risk.color }}>
                      {risk.icon} {risk.level}
                    </strong>
                  </div>
                  <div className="previewItem">
                    <span className="previewLabel">Эффективная доходность</span>
                    <strong className="previewValue">{effectiveReturn}%</strong>
                    <small>(с учетом инфляции)</small>
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="errorMessage">
                <AlertCircle size={16} />
                {error}
              </div>
            )}

            <div className="formButtons">
              <button
                type="button"
                onClick={handleCancel}
                className="formButton cancelButton"
                disabled={saving}
              >
                <X size={14} />
                Отмена
              </button>
              <button
                type="submit"
                className="formButton submitButton"
                disabled={saving}
              >
                <Save size={14} />
                {saving ? "Сохранение..." : useMockData ? "Продолжить (демо)" : "Сохранить изменения"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  );
}

export default EditScenarioPage;