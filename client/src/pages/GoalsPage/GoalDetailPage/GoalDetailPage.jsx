// src/pages/GoalsPage/GoalDetailPage/GoalDetailPage.jsx
import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import Layout from "../../../components/Layout";
import { getGoal, getScenarios, getPayments, getCheckpointsByGoal, updateCheckpoint, deleteCheckpoint, createCheckpoint } from "../../../api/api";
import "./GoalDetailPage.css";

function GoalDetailPage() {
  const { goalId } = useParams();
  const navigate = useNavigate();
  
  const [goal, setGoal] = useState(null);
  const [scenarios, setScenarios] = useState([]);
  const [payments, setPayments] = useState([]);
  const [checkpoints, setCheckpoints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [showCheckpointForm, setShowCheckpointForm] = useState(false);
  const [editingCheckpoint, setEditingCheckpoint] = useState(null);

  useEffect(() => {
    if (goalId) {
      loadData();
    }
  }, [goalId]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError("");
      
      const [goalData, scenariosData, paymentsData, checkpointsData] = await Promise.all([
        getGoal(goalId),
        getScenarios(goalId).catch(() => []),
        getPayments(goalId).catch(() => []),
        getCheckpointsByGoal(goalId).catch(() => [])
      ]);
      
      if (!goalData) {
        setError("Цель не найдена");
        return;
      }
      
      setGoal(goalData);
      setScenarios(scenariosData || []);
      setPayments(paymentsData || []);
      setCheckpoints(checkpointsData || []);
      
    } catch (error) {
      console.error("Ошибка загрузки данных:", error);
      setError(`Не удалось загрузить данные: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteGoal = async () => {
    if (!window.confirm(`Вы уверены, что хотите удалить цель "${goal?.title}"? Это действие нельзя отменить.`)) {
      return;
    }
    try {
      setDeleting(true);
      await deleteGoal(goalId);
      alert("Цель успешно удалена!");
      navigate("/goals");
    } catch (error) {
      console.error("Ошибка удаления цели:", error);
      alert(`Ошибка удаления: ${error.message}`);
    } finally {
      setDeleting(false);
    }
  };

  // ============ КОНТРОЛЬНЫЕ ТОЧКИ ============
  const handleCreateCheckpoint = async (checkpointData) => {
    try {
      await createCheckpoint(checkpointData);
      await loadData();
      setShowCheckpointForm(false);
      alert("✅ Контрольная точка создана!");
    } catch (error) {
      alert("❌ Ошибка: " + error.message);
    }
  };

  const handleUpdateCheckpoint = async (checkpointId, checkpointData) => {
    try {
      await updateCheckpoint(checkpointId, checkpointData);
      await loadData();
      setEditingCheckpoint(null);
      alert("✅ Контрольная точка обновлена!");
    } catch (error) {
      alert("❌ Ошибка: " + error.message);
    }
  };

  const handleDeleteCheckpoint = async (checkpointId, title) => {
    if (!window.confirm(`Удалить контрольную точку "${title}"?`)) return;
    try {
      await deleteCheckpoint(checkpointId);
      await loadData();
      alert("✅ Контрольная точка удалена!");
    } catch (error) {
      alert("❌ Ошибка: " + error.message);
    }
  };

  const handleMarkCheckpointComplete = async (checkpointId) => {
    try {
      await updateCheckpoint(checkpointId, { status: "completed" });
      await loadData();
      alert("✅ Контрольная точка отмечена как выполненная!");
    } catch (error) {
      alert("❌ Ошибка: " + error.message);
    }
  };

  // ============ ФОРМА КОНТРОЛЬНОЙ ТОЧКИ ============
  const CheckpointFormComponent = ({ initialData, onSubmit, onCancel, isEdit }) => {
    const [formData, setFormData] = useState({
      title: initialData?.title || "",
      target_amount: initialData?.target_amount || "",
      target_date: initialData?.target_date || "",
      priority: initialData?.priority || "medium",
      description: initialData?.description || "",
    });
    const [errors, setErrors] = useState({});
    const [submitting, setSubmitting] = useState(false);

    const handleChange = (e) => {
      const { name, value } = e.target;
      setFormData(prev => ({ ...prev, [name]: value }));
      if (errors[name]) setErrors(prev => ({ ...prev, [name]: "" }));
    };

    const validateForm = () => {
      const newErrors = {};
      if (!formData.title.trim()) newErrors.title = "Введите название";
      if (!formData.target_amount || parseFloat(formData.target_amount) <= 0) {
        newErrors.target_amount = "Введите корректную сумму";
      }
      if (formData.target_amount && parseFloat(formData.target_amount) > parseFloat(goal?.target_amount || 0)) {
        newErrors.target_amount = `Сумма не может быть больше ${formatCurrency(goal?.target_amount)} ₽`;
      }
      return newErrors;
    };

    const handleSubmit = async (e) => {
      e.preventDefault();
      const validationErrors = validateForm();
      if (Object.keys(validationErrors).length > 0) {
        setErrors(validationErrors);
        return;
      }
      setSubmitting(true);
      try {
        await onSubmit({
          goal_id: parseInt(goalId),
          title: formData.title.trim(),
          target_amount: parseFloat(formData.target_amount),
          target_date: formData.target_date || null,
          priority: formData.priority,
          description: formData.description || "",
          status: initialData?.status || "pending"
        });
      } catch (error) {
        setErrors({ submit: error.message });
      } finally {
        setSubmitting(false);
      }
    };

    return (
      <form onSubmit={handleSubmit} className="checkpoint-form-inline">
        <h4>{isEdit ? "✏️ Редактировать точку" : "➕ Новая контрольная точка"}</h4>
        <div className="checkpoint-form-row">
          <div className="checkpoint-form-group">
            <input type="text" name="title" value={formData.title} onChange={handleChange} placeholder="Название *" disabled={submitting} />
            {errors.title && <div className="error">{errors.title}</div>}
          </div>
          <div className="checkpoint-form-group">
            <input type="number" name="target_amount" value={formData.target_amount} onChange={handleChange} placeholder="Сумма *" min="0" step="1000" disabled={submitting} />
            {errors.target_amount && <div className="error">{errors.target_amount}</div>}
          </div>
          <div className="checkpoint-form-group">
            <input type="date" name="target_date" value={formData.target_date} onChange={handleChange} disabled={submitting} />
          </div>
          <div className="checkpoint-form-group">
            <select name="priority" value={formData.priority} onChange={handleChange} disabled={submitting}>
              <option value="high">🔴 Высокий</option>
              <option value="medium">🟡 Средний</option>
              <option value="low">🟢 Низкий</option>
            </select>
          </div>
          <div className="checkpoint-form-group">
            <input type="text" name="description" value={formData.description} onChange={handleChange} placeholder="Описание" disabled={submitting} />
          </div>
        </div>
        {errors.submit && <div className="error submit-error">{errors.submit}</div>}
        <div className="checkpoint-form-buttons">
          <button type="button" onClick={onCancel} className="cancel-btn" disabled={submitting}>Отмена</button>
          <button type="submit" className="submit-btn" disabled={submitting}>
            {submitting ? (isEdit ? "Сохранение..." : "Создание...") : (isEdit ? "Сохранить" : "Создать")}
          </button>
        </div>
      </form>
    );
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
        year: 'numeric'
      });
    } catch {
      return "—";
    }
  };

  const calculateProgress = () => {
    if (!goal) return 0;
    const target = parseFloat(goal.target_amount) || 1;
    const current = parseFloat(goal.current_amount) || 0;
    return Math.min(Math.round((current / target) * 100), 100);
  };

  const calculateRemainingMonths = () => {
    if (!goal) return null;
    const target = parseFloat(goal.target_amount) || 0;
    const current = parseFloat(goal.current_amount) || 0;
    const monthly = parseFloat(goal.monthly_contribution) || 0;
    if (monthly <= 0) return null;
    const remaining = target - current;
    if (remaining <= 0) return 0;
    return Math.ceil(remaining / monthly);
  };

  const getStatusText = (status) => {
    switch (status) {
      case "active": return "Активна";
      case "completed": return "Выполнена";
      case "paused": return "Приостановлена";
      default: return status;
    }
  };

  const getPriorityIcon = (priority) => {
    switch (priority) {
      case "high": return "🔴";
      case "medium": return "🟡";
      case "low": return "🟢";
      default: return "⚪";
    }
  };

  const getCheckpointStatusText = (status) => {
    switch (status) {
      case "pending": return "⏳ В процессе";
      case "completed": return "✅ Выполнена";
      case "overdue": return "⚠️ Просрочена";
      default: return status;
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="loadingContainer">
          <div className="loadingSpinner"></div>
          <p>Загружаем данные цели...</p>
        </div>
      </Layout>
    );
  }

  if (error || !goal) {
    return (
      <Layout>
        <div className="goalDetailContainer">
          <div className="errorMessage">
            <strong>Внимание:</strong> {error || "Цель не найдена"}
          </div>
          <Link to="/goals" className="backButton">← Вернуться к списку целей</Link>
        </div>
      </Layout>
    );
  }

  const progress = calculateProgress();
  const remainingMonths = calculateRemainingMonths();
  const totalPayments = payments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);

  return (
    <Layout>
      <div className="goalDetailContainer">
        {/* Хлебные крошки */}
        <div className="breadcrumb">
          <Link to="/">Главная</Link>
          <span className="separator">›</span>
          <Link to="/goals">Цели</Link>
          <span className="separator">›</span>
          <span>{goal.title}</span>
        </div>

        {/* Заголовок и действия */}
        <div className="goalHeader">
          <div className="goalTitleSection">
            <h1>{goal.title}</h1>
            <span className={`goalStatusBadge status${goal.status}`}>
              {getStatusText(goal.status)}
            </span>
          </div>
          <div className="goalActionsButton">
            <button onClick={() => navigate(`/goals/${goalId}/edit`)} className="actionButtonGoal editButtonGoal">✏️ Редактировать</button>
            <button onClick={() => navigate(`/scenarios/${goalId}`)} className="actionButtonGoal scenariosButtonGoal">📈 Сценарии ({scenarios.length})</button>
            <button onClick={() => navigate(`/payments/${goalId}`)} className="actionButtonGoal paymentsButtonGoal">💳 Платежи</button>
            <button onClick={handleDeleteGoal} className="actionButtonGoal deleteButtonGoal" disabled={deleting}>
              {deleting ? "🗑️ Удаление..." : "🗑️ Удалить"}
            </button>
          </div>
        </div>

        {/* Основная информация */}
        <div className="goalOverview">
          <div className="goalStatsDetail">
            <div className="statCard"><div className="statIcon">🎯</div><div className="statLabel">Целевая сумма</div><div className="statValue">{formatCurrency(goal.target_amount)} ₽</div></div>
            <div className="statCard"><div className="statIcon">💰</div><div className="statLabel">Текущая сумма</div><div className="statValue">{formatCurrency(goal.current_amount)} ₽</div></div>
            <div className="statCard"><div className="statIcon">📊</div><div className="statLabel">Прогресс</div><div className="statValue">{progress}%</div></div>
            <div className="statCard"><div className="statIcon">⏱️</div><div className="statLabel">Осталось месяцев</div><div className="statValue">{remainingMonths !== null ? remainingMonths : "—"}</div></div>
          </div>
          <div className="progressSection">
            <div className="progressLabel"><span>Процесс достижения цели</span><span className="progressPercentage">{progress}%</span></div>
            <div className="progressBar"><div className="progressFill" style={{ width: `${progress}%` }} /></div>
          </div>
        </div>

        {/* Детали цели */}
        <div className="goalDetails">
          <div className="detailsCard">
            <h3>Детали цели</h3>
            <div className="detailsGrid">
              <div className="detailRow"><span className="detailLabel">Дата начала:</span><span className="detailValue">{formatDate(goal.start_date)}</span></div>
              <div className="detailRow"><span className="detailLabel">Плановая дата завершения:</span><span className="detailValue">{formatDate(goal.deadline_date) || "—"}</span></div>
              <div className="detailRow"><span className="detailLabel">Ежемесячный взнос:</span><span className="detailValue">{formatCurrency(goal.monthly_contribution)} ₽</span></div>
              <div className="detailRow"><span className="detailLabel">Начальная сумма:</span><span className="detailValue">{formatCurrency(goal.initial_amount)} ₽</span></div>
              <div className="detailRow"><span className="detailLabel">Создана:</span><span className="detailValue">{formatDate(goal.created_at)}</span></div>
              <div className="detailRow"><span className="detailLabel">Обновлена:</span><span className="detailValue">{formatDate(goal.updated_at)}</span></div>
            </div>
          </div>
          <div className="detailsCard">
            <h3>Финансовая информация</h3>
            <div className="detailsGrid">
              <div className="detailRow highlight"><span className="detailLabel">Осталось накопить:</span><span className="detailValue">{formatCurrency(goal.target_amount - goal.current_amount)} ₽</span></div>
              <div className="detailRow"><span className="detailLabel">Всего платежей:</span><span className="detailValue">{payments.length}</span></div>
              <div className="detailRow"><span className="detailLabel">Общая сумма платежей:</span><span className="detailValue">{formatCurrency(totalPayments)} ₽</span></div>
              <div className="detailRow"><span className="detailLabel">Средний платеж:</span><span className="detailValue">{payments.length > 0 ? formatCurrency(totalPayments / payments.length) : "0"} ₽</span></div>
            </div>
          </div>
        </div>

        {/* Вкладки */}
        <div className="tabsSection">
          <div className="tabsHeader">
            <button className={`tabButton ${activeTab === "overview" ? "active" : ""}`} onClick={() => setActiveTab("overview")}>Обзор</button>
            <button className={`tabButton ${activeTab === "scenarios" ? "active" : ""}`} onClick={() => setActiveTab("scenarios")}>Сценарии ({scenarios.length})</button>
            <button className={`tabButton ${activeTab === "payments" ? "active" : ""}`} onClick={() => setActiveTab("payments")}>История платежей ({payments.length})</button>
            <button className={`tabButton ${activeTab === "checkpoints" ? "active" : ""}`} onClick={() => setActiveTab("checkpoints")}>Контрольные точки ({checkpoints.length})</button>
          </div>

          <div className="tabContent">
            {/* Вкладка Обзор */}
            {activeTab === "overview" && (
              <div className="overviewTab">
                <p>Здесь будет общая информация о цели и рекомендации.</p>
              </div>
            )}

            {/* Вкладка Сценарии */}
            {activeTab === "scenarios" && (
              <div className="scenariosTab">
                {scenarios.length > 0 ? (
                  <div className="scenariosList">
                    {scenarios.map(scenario => (
                      <div key={scenario.scenario_id} className="scenarioItem" onClick={() => navigate(`/scenarios/detail/${scenario.scenario_id}`)}>
                        <h4>{scenario.name}</h4>
                        <p>Взнос: {formatCurrency(scenario.monthly_contribution)} ₽</p>
                        <p>Доходность: {scenario.expected_return}%</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="emptyState">
                    <p>Сценариев пока нет</p>
                    <button onClick={() => navigate(`/scenarios/new/${goalId}`)} className="createButton">Создать сценарий</button>
                  </div>
                )}
              </div>
            )}

            {/* Вкладка Платежи */}
            {activeTab === "payments" && (
              <div className="paymentsTab">
                {payments.length > 0 ? (
                  <table className="paymentsTable">
                    <thead><tr><th>Дата</th><th>Сумма</th><th>Описание</th></tr></thead>
                    <tbody>
                      {payments.map(payment => (
                        <tr key={payment.payment_id}>
                          <td>{formatDate(payment.payment_date)}</td>
                          <td>{formatCurrency(payment.amount)} ₽</td>
                          <td>{payment.description || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="emptyState">
                    <p>Платежей пока нет</p>
                    <button onClick={() => navigate(`/goals/${goalId}/payments`)} className="createButton">Добавить платеж</button>
                  </div>
                )}
              </div>
            )}

            {/* Вкладка Контрольные точки */}
            {activeTab === "checkpoints" && (
              <div className="checkpointsTab">
                {/* Кнопка добавления */}
                {!showCheckpointForm && !editingCheckpoint && (
                  <div className="addCheckpointButton">
                    <button onClick={() => setShowCheckpointForm(true)} className="createButton">➕ Добавить контрольную точку</button>
                  </div>
                )}

                {/* Форма создания */}
                {showCheckpointForm && (
                  <CheckpointFormComponent
                    onSubmit={handleCreateCheckpoint}
                    onCancel={() => setShowCheckpointForm(false)}
                    isEdit={false}
                  />
                )}

                {/* Форма редактирования */}
                {editingCheckpoint && (
                  <CheckpointFormComponent
                    initialData={editingCheckpoint}
                    onSubmit={(data) => handleUpdateCheckpoint(editingCheckpoint.checkpoint_id, data)}
                    onCancel={() => setEditingCheckpoint(null)}
                    isEdit={true}
                  />
                )}

                {/* Таблица контрольных точек */}
                {checkpoints.length > 0 ? (
                  <table className="checkpointsTable">
                    <thead>
                      <tr>
                        <th>Название</th>
                        <th>Сумма</th>
                        <th>Срок</th>
                        <th>Приоритет</th>
                        <th>Статус</th>
                        <th>Действия</th>
                      </tr>
                    </thead>
                    <tbody>
                      {checkpoints.map(cp => {
                        const isOverdue = cp.status === "pending" && cp.target_date && new Date(cp.target_date) < new Date();
                        return (
                          <tr key={cp.checkpoint_id} className={isOverdue ? "overdue-row" : ""}>
                            <td><strong>{cp.title}</strong>{cp.description && <div className="checkpoint-desc">{cp.description}</div>}</td>
                            <td className="amount-cell">{formatCurrency(cp.target_amount)} ₽</td>
                            <td>{formatDate(cp.target_date)}</td>
                            <td><span className="priority-icon">{getPriorityIcon(cp.priority)} {cp.priority === "high" ? "Высокий" : cp.priority === "medium" ? "Средний" : "Низкий"}</span></td>
                            <td>
                              <span className={`checkpoint-status ${cp.status}`}>
                                {getCheckpointStatusText(cp.status)}
                                {isOverdue && <span className="overdue-badge"> Просрочено!</span>}
                              </span>
                            </td>
                            <td className="table-actions">
                              {cp.status === "pending" && (
                                <button className="action-btn complete" onClick={() => handleMarkCheckpointComplete(cp.checkpoint_id)} title="Отметить выполненной">✅</button>
                              )}
                              <button className="action-btn edit" onClick={() => setEditingCheckpoint(cp)} title="Редактировать">✏️</button>
                              <button className="action-btn delete" onClick={() => handleDeleteCheckpoint(cp.checkpoint_id, cp.title)} title="Удалить">🗑️</button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                ) : (
                  !showCheckpointForm && !editingCheckpoint && (
                    <div className="emptyState">
                      <p>Контрольных точек пока нет</p>
                    </div>
                  )
                )}
              </div>
            )}
          </div>
        </div>

        {/* Кнопки навигации */}
        <div className="navigationButtons">
          <button onClick={() => navigate("/goals")} className="navButton">← Все цели</button>
          <button onClick={() => navigate(`/forecast/${goalId}`)} className="navButton primary">🔮 Прогноз</button>
        </div>
      </div>
    </Layout>
  );
}

export default GoalDetailPage;