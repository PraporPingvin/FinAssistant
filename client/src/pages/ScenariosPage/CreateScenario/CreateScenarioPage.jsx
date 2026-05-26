import React, { useState, useEffect } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import {
  Target,
  DollarSign,
  TrendingUp,
  Activity,
  AlertCircle,
  ArrowLeft,
  Plus,
  X,
  Calendar,
  Shield,
  Zap,
} from "lucide-react";
import Layout from "../../../components/Layout";
import { createScenario, getGoal, getScenarios } from "../../../api/api";
import "./CreateScenarioPage.css";

function CreateScenarioPage() {
  const [formData, setFormData] = useState({
    name: "",
    monthly_contribution: "",
    expected_return: "7.5",
    inflation_rate: "6.0",
    description: "",
  });
  
  const [goal, setGoal] = useState(null);
  const [existingScenarios, setExistingScenarios] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [nameWarning, setNameWarning] = useState("");
  const navigate = useNavigate();
  const { goalId } = useParams();

  useEffect(() => {
    if (goalId) {
      loadGoalData();
    }
  }, [goalId]);

  const loadGoalData = async () => {
    try {
      const goalData = await getGoal(goalId);
      setGoal(goalData);
      
      try {
        const scenarios = await getScenarios(goalId);
        setExistingScenarios(scenarios || []);
      } catch (error) {
        console.error("Ошибка загрузки сценариев:", error);
      }
    } catch (error) {
      console.error("Ошибка загрузки цели:", error);
    }
  };

  const checkDuplicateName = (name) => {
    if (!name.trim()) return null;
    const normalizedInput = name.trim().toLowerCase();
    return existingScenarios.find(s => s.name?.toLowerCase() === normalizedInput);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    if (["monthly_contribution", "expected_return", "inflation_rate"].includes(name)) {
      const numericValue = value.replace(/[^\d.]/g, '');
      setFormData(prev => ({ ...prev, [name]: numericValue }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
    
    if (name === "name" && value.trim()) {
      const duplicate = checkDuplicateName(value);
      if (duplicate) {
        setNameWarning(`Сценарий с названием "${duplicate.name}" уже существует`);
      } else {
        setNameWarning("");
      }
    }
    
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: "" }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.name.trim()) {
      newErrors.name = "Введите название сценария";
    }
    
    const duplicate = checkDuplicateName(formData.name);
    if (duplicate) {
      newErrors.name = `Сценарий с названием "${duplicate.name}" уже существует`;
    }
    
    if (!formData.monthly_contribution || parseFloat(formData.monthly_contribution) <= 0) {
      newErrors.monthly_contribution = "Введите корректный ежемесячный взнос";
    }
    
    if (!formData.expected_return || parseFloat(formData.expected_return) < 0) {
      newErrors.expected_return = "Введите корректную доходность";
    }
    
    if (!formData.inflation_rate || parseFloat(formData.inflation_rate) < 0) {
      newErrors.inflation_rate = "Введите корректную инфляцию";
    }
    
    return newErrors;
  };

  const formatCurrency = (value) => {
    if (!value) return "0";
    const num = parseFloat(value);
    return new Intl.NumberFormat("ru-RU").format(num);
  };

  const calculateMonthsToGoal = () => {
    if (!goal || !formData.monthly_contribution) return 0;
    
    const target = parseFloat(goal.target_amount) || 0;
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    
    setLoading(true);
    
    try {
      const scenarioData = {
        goal_id: parseInt(goalId),
        name: formData.name.trim(),
        monthly_contribution: parseFloat(formData.monthly_contribution),
        expected_return: parseFloat(formData.expected_return),
        inflation_rate: parseFloat(formData.inflation_rate),
        target_amount: parseFloat(goal?.target_amount || 0)
      };
      
      await createScenario(scenarioData);
      navigate(`/scenarios/${goalId}`);
      
    } catch (error) {
      console.error("Ошибка создания сценария:", error);
      
      if (error.message.includes("повторяющееся значение ключа")) {
        setErrors({
          submit: `Сценарий с названием "${formData.name}" уже существует. Пожалуйста, выберите другое название.`
        });
      } else {
        setErrors({
          submit: `Ошибка при создании сценария: ${error.message}`
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigate(-1);
  };

  const monthsToGoal = calculateMonthsToGoal();
  const risk = calculateRiskLevel(formData.expected_return);
  const duplicate = checkDuplicateName(formData.name);
  const effectiveReturn = (parseFloat(formData.expected_return) - parseFloat(formData.inflation_rate)).toFixed(1);

  return (
    <Layout>
      <div className="createScenarioPage">
        <button onClick={handleCancel} className="backButtonNav">
          <ArrowLeft size={16} />
          Назад
        </button>

        <div className="pageHeaderCreateScenario">
          <h1>Создание нового сценария</h1>
          <p>Настройте параметры для моделирования стратегии достижения цели</p>
        </div>
        
        {goal && (
          <div className="goalInfoCard">
            <div className="goalInfoHeader">
              <Target size={20} />
              <h3>{goal.title}</h3>
            </div>
            <div className="goalInfoStatsScenario">
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
                  {Math.round((parseFloat(goal.current_amount) / parseFloat(goal.target_amount)) * 100)}%
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
        
        <div className="scenarioFormContainer">
          {errors.submit && (
            <div className="errorMessage">
              <AlertCircle size={16} />
              {errors.submit}
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="scenarioForm">
            <div className="formGroup">
              <label className="formLabel">
                Название сценария <span className="required">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Например: Консервативный план с низким риском"
                className={`formInput ${errors.name ? 'error' : duplicate ? 'warning' : ''}`}
                disabled={loading}
              />
              {errors.name && <div className="validationError">{errors.name}</div>}
              {duplicate && !errors.name && (
                <div className="warningMessage">
                  <AlertCircle size={12} />
                  Сценарий с названием "{duplicate.name}" уже существует
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
                  className={`formInput ${errors.monthly_contribution ? 'error' : ''}`}
                  disabled={loading}
                />
                {errors.monthly_contribution && (
                  <div className="validationError">{errors.monthly_contribution}</div>
                )}
                {formData.monthly_contribution && (
                  <div className="currencyPreview">
                    {formatCurrency(formData.monthly_contribution)} ₽ в месяц
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
                  className={`formInput ${errors.expected_return ? 'error' : ''}`}
                  disabled={loading}
                />
                {errors.expected_return && (
                  <div className="validationError">{errors.expected_return}</div>
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
                  className={`formInput ${errors.inflation_rate ? 'error' : ''}`}
                  disabled={loading}
                />
                {errors.inflation_rate && (
                  <div className="validationError">{errors.inflation_rate}</div>
                )}
              </div>
            </div>
            
            {formData.monthly_contribution && formData.expected_return && (
              <div className="previewSection">
                <h4>Предварительный расчет</h4>
                <div className="previewGrid">
                  <div className="previewItem">
                    <span className="previewLabel">Срок достижения</span>
                    <strong className="previewValue">
                      {monthsToGoal > 0 ? `${monthsToGoal} мес.` : "—"}
                    </strong>
                    {monthsToGoal > 0 && (
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
            
            <div className="formGroup">
              <label className="formLabel">Описание сценария (опционально)</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Опишите особенности этого сценария..."
                className="formTextarea"
                rows="3"
                disabled={loading}
              />
            </div>
            
            <div className="formButtons">
              <button
                type="button"
                onClick={handleCancel}
                className="formButton cancelButton"
                disabled={loading}
              >
                <X size={14} />
                Отмена
              </button>
              <button
                type="submit"
                className="formButton submitButton"
                disabled={loading || duplicate}
              >
                <Plus size={14} />
                {loading ? "Создание..." : "Создать сценарий"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  );
}

export default CreateScenarioPage;