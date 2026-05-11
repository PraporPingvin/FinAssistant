import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
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

      // Загружаем сценарий
      const scenarioData = await getScenario(scenarioId);
      setScenario(scenarioData);
      setEditData(scenarioData);

      // Загружаем цель
      const goalData = await getGoal(scenarioData.goal_id);
      setGoal(goalData);

      // Пытаемся загрузить прогноз
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

    // Форматирование числовых полей
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

      // Удаляем undefined поля
      Object.keys(updates).forEach(key =>
        updates[key] === undefined && delete updates[key]
      );

      const updatedScenario = await updateScenario(scenarioId, updates);
      setScenario(updatedScenario);
      setEditMode(false);

      alert("Сценарий успешно обновлен!");

    } catch (error) {
      console.error("Ошибка сохранения:", error);
      alert(`Ошибка сохранения: ${error.message}`);
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
      alert("Сценарий успешно удален!");
      navigate(`/scenarios/${scenario?.goal_id}`);

    } catch (error) {
      console.error("Ошибка удаления:", error);
      alert(`Ошибка удаления: ${error.message}`);
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
    if (returnValue < 5) return { level: "Низкий", color: "#4caf50", icon: "🟢" };
    if (returnValue < 10) return { level: "Средний", color: "#ff9800", icon: "🟡" };
    return { level: "Высокий", color: "#f44336", icon: "🔴" };
  };

  const handleCancelEdit = () => {
    setEditData(scenario);
    setEditMode(false);
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

  if (error || !scenario) {
    return (
      <Layout>
        <div className="scenarioDetailContainer">
          <div className="errorMessage">
            <strong>Внимание:</strong> {error || "Сценарий не найден"}
          </div>
          <Link to="/scenarios" className="backButton">
            ← Вернуться к сценариям
          </Link>
        </div>
      </Layout>
    );
  }

  const monthsToGoal = calculateMonthsToGoal();
  const risk = calculateRiskLevel(scenario.expected_return);
  const effectiveReturn = (parseFloat(scenario.expected_return) - parseFloat(scenario.inflation_rate)).toFixed(1);

  return (
    <Layout>
      <div className="scenarioDetailContainer">
        {/* Хлебные крошки */}
        <div className="breadcrumb">
          <Link to="/">Главная</Link>
          {" > "}
          <Link to="/goals">Цели</Link>
          {" > "}
          {goal && (
            <>
              <Link to={`/goals/${goal.goal_id}`}>{goal.title}</Link>
              {" > "}
            </>
          )}
          <Link to={`/scenarios/${scenario.goal_id}`}>Сценарии</Link>
          {" > "}
          <span>{scenario.name}</span>
        </div>

        {/* Заголовок и действия */}
        <div className="pageHeader">
          <div className="headerContentDetail">
            <div className="headerTop">
              <h1>
                {editMode ? (
                  <input
                    type="text"
                    name="name"
                    value={editData.name || ""}
                    onChange={handleEditChange}
                    className="editTitleInput"
                    placeholder="Название сценария"
                  />
                ) : (
                  scenario.name
                )}
              </h1>
              <div className="scenarioMeta">
                <span className="scenarioDate">Создан: {formatDate(scenario.created_at)}</span>
              </div>
            </div>
            <p className="headerSubtitle">
              Детальная информация о сценарии достижения финансовой цели
            </p>
          </div>

          <div className="actionsContainerDetail">
            {!editMode ? (
              <>
                <button
                  onClick={() => setEditMode(true)}
                  className="actionButtonDetail editButtonDetal"
                >
                  ✏ Редактировать
                </button>
                <button
                  onClick={() => navigate(`/forecast/${scenario.goal_id}?scenario=${scenarioId}`)}
                  className="actionButtonDetail forecastButtonDetail"
                >
                  🔮 Прогноз
                </button>
                <button
                  onClick={handleDelete}
                  className="actionButtonDetail deleteButtonDetail"
                  disabled={deleting}
                >
                  {deleting ? "🗑 Удаление..." : "🗑 Удалить"}
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handleCancelEdit}
                  className="actionButtonDetail cancelButtonDetail"
                  disabled={saving}
                >
                  ✖ Отмена
                </button>
                <button
                  onClick={handleSave}
                  className="actionButtonDetail saveButtonDetail"
                  disabled={saving}
                >
                  {saving ? "💾 Сохранение..." : "💾 Сохранить"}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Основная информация */}
        <div className="scenarioMainInfo">
          <div className="infoCard">
            <h3>Основные параметры</h3>
            <div className="infoGrid">
              <div className="infoItem">
                <span className="infoLabel">Ежемесячный взнос:</span>
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
                <span className="infoLabel">Ожидаемая доходность:</span>
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
                <span className="infoLabel">Ожидаемая инфляция:</span>
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
                <span className="infoLabel">Целевая сумма:</span>
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
                  <span className="infoValue">
                    {formatCurrency(scenario.target_amount)} ₽
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="infoCard">
            <h3>Расчетные показатели</h3>
            <div className="infoGrid">
              <div className="infoItem">
                <span className="infoLabel">Срок достижения:</span>
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
                <span className="infoLabel">Уровень риска:</span>
                <span className="infoValue">
                  <span
                    className="riskBadge"
                    style={{ backgroundColor: risk.color }}
                  >
                    {risk.icon} {risk.level}
                  </span>
                </span>
              </div>

              <div className="infoItem">
                <span className="infoLabel">Эффективная доходность:</span>
                <span className="infoValue highlight">
                  {effectiveReturn}%
                  <span className="subText">(с учетом инфляции)</span>
                </span>
              </div>

              <div className="infoItem">
                <span className="infoLabel">Ежемесячный темп накопления:</span>
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

        {/* Навигация */}
        <div className="navigationSection">
          <button
            onClick={() => navigate(`/scenarios/${scenario.goal_id}`)}
            className="navigationButton backButtonDetail"
          >
            ← Назад к списку сценариев
          </button>
          <button
            onClick={() => navigate(`/goals/${scenario.goal_id}`)}
            className="navigationButton forwardButtonDetail"
          >
            Перейти к цели →
          </button>
        </div>
      </div>
    </Layout>
  );
}

export default ScenarioDetailPage;