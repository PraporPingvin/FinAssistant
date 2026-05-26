import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  ArrowLeft,
  Target,
  DollarSign,
  TrendingUp,
  Activity,
  Calendar,
  Clock,
  Edit2,
  Trash2,
  AlertCircle,
  Shield,
  Zap,
  Save,
  X,
  Eye,
  BarChart3,
} from "lucide-react";
import Layout from "../../../components/Layout";
import { getScenario, updateScenario, deleteScenario, getGoal, getForecast } from "../../../api/api";
import "./ScenarioDetailPage.css";

function ScenarioDetailPage() {
  const { scenarioId } = useParams();
  const navigate = useNavigate();

  const [scenario, setScenario] = useState(null);
  const [goal, setGoal] = useState(null);
  const [forecast, setForecast] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState({});
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (scenarioId) {
      loadData();
    }
  }, [scenarioId]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError("");

      const scenarioData = await getScenario(scenarioId);
      setScenario(scenarioData);
      setEditData(scenarioData);

      const goalData = await getGoal(scenarioData.goal_id);
      setGoal(goalData);

      try {
        const forecastData = await getForecast(scenarioData.goal_id);
        setForecast(forecastData);
      } catch (forecastError) {
        console.log("Прогноз не найден:", forecastError);
      }

    } catch (error) {
      console.error("Ошибка загрузки данных:", error);
      setError(`Не удалось загрузить данные: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;

    if (["monthly_contribution", "expected_return", "inflation_rate", "target_amount"].includes(name)) {
      const numericValue = value.replace(/[^\d.]/g, '');
      setEditData(prev => ({
        ...prev,
        [name]: numericValue
      }));
    } else {
      setEditData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      const updates = {
        name: editData.name?.trim(),
        monthly_contribution: parseFloat(editData.monthly_contribution),
        expected_return: parseFloat(editData.expected_return),
        inflation_rate: parseFloat(editData.inflation_rate),
        target_amount: parseFloat(editData.target_amount)
      };

      Object.keys(updates).forEach(key =>
        updates[key] === undefined && delete updates[key]
      );

      await updateScenario(scenarioId, updates);
      setScenario(editData);
      setEditMode(false);

    } catch (error) {
      console.error("Ошибка сохранения:", error);
      setError(`Ошибка сохранения: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Вы уверены, что хотите удалить сценарий "${scenario?.name}"? Это действие нельзя отменить.`)) {
      return;
    }

    try {
      setDeleting(true);
      await deleteScenario(scenarioId);
      navigate(`/scenarios/${scenario?.goal_id}`);
    } catch (error) {
      console.error("Ошибка удаления:", error);
      setError(`Ошибка удаления: ${error.message}`);
    } finally {
      setDeleting(false);
    }
  };

  const formatCurrency = (amount) => {
    const num = parseFloat(amount) || 0;
    return new Intl.NumberFormat('ru-RU').format(num);
  };

  const formatDate = (dateString) => {
    if (!dateString) return "—";
    try {
      return new Date(dateString).toLocaleDateString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return "—";
    }
  };

  const calculateMonthsToGoal = () => {
    if (!goal || !scenario) return 0;

    const target = parseFloat(scenario.target_amount || goal.target_amount) || 0;
    const current = parseFloat(goal.current_amount) || 0;
    const monthly = parseFloat(scenario.monthly_contribution) || 0;

    if (monthly <= 0) return Infinity;

    const remaining = target - current;
    return Math.ceil(remaining / monthly);
  };

  const calculateRiskLevel = (expectedReturn) => {
    const returnValue = parseFloat(expectedReturn) || 0;
    if (returnValue < 5) return { level: "Низкий", color: "#2E7D32", icon: <Shield size={14} /> };
    if (returnValue < 10) return { level: "Средний", color: "#F5A623", icon: <Activity size={14} /> };
    return { level: "Высокий", color: "#E35D5D", icon: <Zap size={14} /> };
  };

  const handleCancelEdit = () => {
    setEditData(scenario);
    setEditMode(false);
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

  if (error || !scenario) {
    return (
      <Layout>
        <div className="scenarioDetailPage">
          <div className="errorCard">
            <AlertCircle size={48} />
            <h2>Ошибка</h2>
            <p>{error || "Сценарий не найден"}</p>
            <button onClick={() => navigate("/scenarios")} className="backButton">
              ← Вернуться к сценариям
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  const monthsToGoal = calculateMonthsToGoal();
  const risk = calculateRiskLevel(scenario.expected_return);
  const effectiveReturn = (parseFloat(scenario.expected_return) - parseFloat(scenario.inflation_rate)).toFixed(1);

  return (
    <Layout>
      <div className="scenarioDetailPage">
        <button onClick={() => navigate(-1)} className="backButtonNav">
          <ArrowLeft size={16} />
          Назад
        </button>

        <div className="pageHeader">
          <div className="headerContentScenario">
            {editMode ? (
              <input
                type="text"
                name="name"
                value={editData.name || ""}
                onChange={handleEditChange}
                className="titleInput"
                placeholder="Название сценария"
              />
            ) : (
              <h1>{scenario.name}</h1>
            )}
            <div className="scenarioMeta">
              <span className="metaItem">
                <Calendar size={14} />
                Создан: {formatDate(scenario.created_at)}
              </span>
            </div>
            <p className="headerSubtitle">Детальная информация о сценарии достижения финансовой цели</p>
          </div>

          <div className="actionsContainer">
            {!editMode ? (
              <>
                <button onClick={() => setEditMode(true)} className="actionButton editButtonScenario" disabled={deleting}>
                  <Edit2 size={16} />
                  Редактировать
                </button>
                <button onClick={() => navigate(`/forecast/${scenario.goal_id}?scenario=${scenarioId}`)} className="actionButton forecastButton">
                  <BarChart3 size={16} />
                  Прогноз
                </button>
                <button onClick={handleDelete} className="actionButton deleteButton" disabled={deleting}>
                  <Trash2 size={16} />
                  {deleting ? "Удаление..." : "Удалить"}
                </button>
              </>
            ) : (
              <>
                <button onClick={handleCancelEdit} className="actionButton cancelButton" disabled={saving}>
                  <X size={16} />
                  Отмена
                </button>
                <button onClick={handleSave} className="actionButton saveButton" disabled={saving}>
                  <Save size={16} />
                  {saving ? "Сохранение..." : "Сохранить"}
                </button>
              </>
            )}
          </div>
        </div>

        <div className="scenarioMainInfo">
          <div className="infoCard">
            <h3>Основные параметры</h3>
            <div className="infoGridScenarioDetail">
              <div className="infoItem">
                <span className="infoLabel">
                  <DollarSign size={14} />
                  Ежемесячный взнос
                </span>
                {editMode ? (
                  <input
                    type="text"
                    name="monthly_contribution"
                    value={editData.monthly_contribution || ""}
                    onChange={handleEditChange}
                    className="editInput"
                    placeholder="15000"
                  />
                ) : (
                  <span className="infoValue highlight">
                    {formatCurrency(scenario.monthly_contribution)} ₽
                  </span>
                )}
              </div>

              <div className="infoItem">
                <span className="infoLabel">
                  <TrendingUp size={14} />
                  Ожидаемая доходность
                </span>
                {editMode ? (
                  <input
                    type="text"
                    name="expected_return"
                    value={editData.expected_return || ""}
                    onChange={handleEditChange}
                    className="editInput"
                    placeholder="7.5"
                  />
                ) : (
                  <span className="infoValue">{scenario.expected_return}%</span>
                )}
              </div>

              <div className="infoItem">
                <span className="infoLabel">
                  <Activity size={14} />
                  Ожидаемая инфляция
                </span>
                {editMode ? (
                  <input
                    type="text"
                    name="inflation_rate"
                    value={editData.inflation_rate || ""}
                    onChange={handleEditChange}
                    className="editInput"
                    placeholder="6.0"
                  />
                ) : (
                  <span className="infoValue">{scenario.inflation_rate}%</span>
                )}
              </div>

              <div className="infoItem">
                <span className="infoLabel">
                  <Target size={14} />
                  Целевая сумма
                </span>
                {editMode ? (
                  <input
                    type="text"
                    name="target_amount"
                    value={editData.target_amount || ""}
                    onChange={handleEditChange}
                    className="editInput"
                    placeholder="1000000"
                  />
                ) : (
                  <span className="infoValue">{formatCurrency(scenario.target_amount)} ₽</span>
                )}
              </div>
            </div>
          </div>

          <div className="infoCard">
            <h3>Расчетные показатели</h3>
            <div className="infoGridScenarioDetail">
              <div className="infoItem">
                <span className="infoLabel">
                  <Clock size={14} />
                  Срок достижения
                </span>
                <span className="infoValue">
                  {isFinite(monthsToGoal) ? (
                    <>
                      <strong>{monthsToGoal}</strong> месяцев
                      <span className="subText">
                        ({Math.floor(monthsToGoal / 12)} г. {monthsToGoal % 12} мес.)
                      </span>
                    </>
                  ) : (
                    <span className="warningText">Недостижимо</span>
                  )}
                </span>
              </div>

              <div className="infoItem">
                <span className="infoLabel">
                  <Shield size={14} />
                  Уровень риска
                </span>
                <span className="infoValue">
                  <span className="riskBadge" style={{ backgroundColor: risk.color }}>
                    {risk.icon} {risk.level}
                  </span>
                </span>
              </div>

              <div className="infoItem">
                <span className="infoLabel">
                  <TrendingUp size={14} />
                  Эффективная доходность
                </span>
                <span className="infoValue highlight">
                  {effectiveReturn}%
                  <span className="subText">(с учетом инфляции)</span>
                </span>
              </div>

              <div className="infoItem">
                <span className="infoLabel">
                  <DollarSign size={14} />
                  Ежемесячный темп
                </span>
                <span className="infoValue">
                  {formatCurrency(scenario.monthly_contribution)} ₽
                  <span className="subText">
                    ({formatCurrency(Math.ceil(scenario.monthly_contribution / 30))} ₽/день)
                  </span>
                </span>
              </div>
            </div>
          </div>
        </div>

        {goal && (
          <div className="goalCard">
            <h3>
              <Target size={18} />
              Связанная цель
            </h3>
            <div className="goalInfo">
              <div className="goalRow">
                <span className="goalLabel">Название</span>
                <span className="goalValue">{goal.title}</span>
              </div>
              <div className="goalRow">
                <span className="goalLabel">Целевая сумма</span>
                <span className="goalValue">{formatCurrency(goal.target_amount)} ₽</span>
              </div>
              <div className="goalRow">
                <span className="goalLabel">Текущая сумма</span>
                <span className="goalValue">{formatCurrency(goal.current_amount)} ₽</span>
              </div>
              <div className="goalRow">
                <span className="goalLabel">Прогресс</span>
                <span className="goalValue">
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
            <div className="goalActions">
              <button onClick={() => navigate(`/goals/${goal.goal_id}`)} className="goalActionButton">
                Перейти к цели →
              </button>
            </div>
          </div>
        )}

        <div className="navigationSection">
          <button onClick={() => navigate(`/scenarios/${scenario.goal_id}`)} className="navButton backButtonDetail">
            ← Назад к списку сценариев
          </button>
          <button onClick={() => navigate(`/scenarios/compare/${scenario.goal_id}`)} className="navButton compareButton">
            <BarChart3 size={16} />
            Сравнить сценарии
          </button>
        </div>
      </div>
    </Layout>
  );
}

export default ScenarioDetailPage;