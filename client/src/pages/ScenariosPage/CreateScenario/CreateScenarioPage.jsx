import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Activity,
  AlertCircle,
  ArrowLeft,
  Calendar,
  DollarSign,
  Plus,
  RefreshCw,
  Shield,
  Target,
  TrendingUp,
  X,
  Zap,
} from "lucide-react";
import Layout from "../../../components/Layout";
import { createScenario, getGoal, getPayments, getRussiaInflation, getScenarios } from "../../../api/api";
import { calculateScenarioMetrics } from "../../../utils/scenarioCalculations";
import "./CreateScenarioPage.css";

function CreateScenarioPage() {
  const [formData, setFormData] = useState({
    name: "",
    monthly_contribution: "",
    expected_return: "0",
    inflation_rate: "6.0",
    description: "",
  });

  const [goal, setGoal] = useState(null);
  const [payments, setPayments] = useState([]);
  const [existingScenarios, setExistingScenarios] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [inflationLoading, setInflationLoading] = useState(false);
  const [inflationInfo, setInflationInfo] = useState("");

  const navigate = useNavigate();
  const { goalId } = useParams();

  useEffect(() => {
    if (!goalId) return;
    loadGoalData();
    loadCurrentInflation(true);
  }, [goalId]);

  const loadGoalData = async () => {
    try {
      const [goalData, paymentsData] = await Promise.all([
        getGoal(goalId),
        getPayments(goalId).catch(() => []),
      ]);

      setGoal(goalData);
      setPayments(paymentsData || []);

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

  const loadCurrentInflation = async (silent = false) => {
    try {
      setInflationLoading(true);
      if (!silent) setInflationInfo("");
      const data = await getRussiaInflation();

      if (!Number.isFinite(Number(data.inflation_rate)) || Number(data.inflation_rate) > 25) {
        throw new Error("Некорректное значение инфляции");
      }

      setFormData((prev) => ({ ...prev, inflation_rate: String(data.inflation_rate) }));
      setInflationInfo(`Подставлено ${data.inflation_rate}%: ${data.source}. Значение можно изменить вручную.`);
    } catch (error) {
      if (!silent) {
        setInflationInfo("Не удалось загрузить инфляцию автоматически. Введите процент вручную.");
      }
    } finally {
      setInflationLoading(false);
    }
  };

  const checkDuplicateName = (name) => {
    if (!name.trim()) return null;
    const normalizedInput = name.trim().toLowerCase();
    return existingScenarios.find((scenario) => scenario.name?.toLowerCase() === normalizedInput);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (["monthly_contribution", "expected_return", "inflation_rate"].includes(name)) {
      setFormData((prev) => ({ ...prev, [name]: value.replace(/[^\d.]/g, "") }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }

    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    const duplicate = checkDuplicateName(formData.name);

    if (!formData.name.trim()) {
      newErrors.name = "Введите название сценария";
    } else if (duplicate) {
      newErrors.name = `Сценарий с названием "${duplicate.name}" уже существует`;
    }

    if (!formData.monthly_contribution || parseFloat(formData.monthly_contribution) <= 0) {
      newErrors.monthly_contribution = "Введите ежемесячный взнос больше 0";
    }

    if (formData.expected_return === "" || parseFloat(formData.expected_return) < 0) {
      newErrors.expected_return = "Введите процент роста или 0";
    }

    if (formData.inflation_rate === "" || parseFloat(formData.inflation_rate) < 0) {
      newErrors.inflation_rate = "Введите инфляцию или подставьте актуальную";
    }

    return newErrors;
  };

  const formatCurrency = (value) => new Intl.NumberFormat("ru-RU").format(parseFloat(value) || 0);

  const formatDate = (date) => {
    if (!date || Number.isNaN(date.getTime())) return "-";
    return date.toLocaleDateString("ru-RU", { day: "2-digit", month: "long", year: "numeric" });
  };

  const addMonths = (date, months) => {
    const next = new Date(date);
    next.setMonth(next.getMonth() + months);
    return next;
  };

  const metrics = useMemo(() => {
    if (!goal) return null;
    return calculateScenarioMetrics({
      goal,
      payments,
      scenario: {
        monthly_contribution: formData.monthly_contribution,
        expected_return: formData.expected_return,
        inflation_rate: formData.inflation_rate,
        target_amount: goal.target_amount,
      },
    });
  }, [goal, payments, formData.monthly_contribution, formData.expected_return, formData.inflation_rate]);

  const baselineMetrics = useMemo(() => {
    if (!goal) return null;
    return calculateScenarioMetrics({ goal, payments, scenario: { monthly_contribution: 1 } });
  }, [goal, payments]);

  const risk = getRiskView(metrics?.risk?.className);
  const duplicate = checkDuplicateName(formData.name);
  const monthsToGoal = metrics?.monthsToGoal;
  const finishDate = Number.isFinite(monthsToGoal) ? addMonths(new Date(), monthsToGoal) : null;
  const progress = metrics?.target > 0 ? Math.min(100, Math.round((metrics.current / metrics.target) * 100)) : 0;
  const realGrowth = Number(metrics?.effectiveReturn || 0).toFixed(1);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setLoading(true);

    try {
      await createScenario({
        goal_id: parseInt(goalId, 10),
        name: formData.name.trim(),
        monthly_contribution: parseFloat(formData.monthly_contribution),
        expected_return: parseFloat(formData.expected_return),
        inflation_rate: parseFloat(formData.inflation_rate),
        target_amount: parseFloat(goal?.target_amount || 0),
      });

      navigate(`/scenarios/${goalId}`);
    } catch (error) {
      console.error("Ошибка создания сценария:", error);
      setErrors({ submit: `Не удалось создать сценарий: ${error.message}` });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="createScenarioPage">
        <button onClick={() => navigate(-1)} className="scenarioBackButton">
          <ArrowLeft size={16} />
          Назад
        </button>

        <section className="createScenarioHero">
          <div>
            <span className="scenarioCreateEyebrow">Новый сценарий</span>
            <h1>Проверить вариант накопления</h1>
            <p>Сценарий показывает, как изменится срок цели, если поменять ежемесячный взнос, инфляцию или дополнительный рост суммы.</p>
          </div>
          <div className="createScenarioHeroPanel">
            <span>Связанная цель</span>
            <strong>{goal?.title || "Загрузка..."}</strong>
            <small>{formatCurrency(goal?.target_amount)} ₽</small>
          </div>
        </section>

        {goal && (
          <section className="scenarioGoalCard">
            <div className="goalInfoHeader">
              <Target size={20} />
              <h2>{goal.title}</h2>
            </div>
            <div className="goalInfoStatsScenario">
              <div><span>Цель</span><strong>{formatCurrency(goal.target_amount)} ₽</strong></div>
              <div><span>Уже накоплено</span><strong>{formatCurrency(baselineMetrics?.current || 0)} ₽</strong></div>
              <div><span>Прогресс</span><strong>{progress}%</strong></div>
            </div>
            <div className="progressBar">
              <div className="progressFill" style={{ width: `${progress}%` }} />
            </div>
          </section>
        )}

        <section className="scenarioCreateWorkspace">
          <form onSubmit={handleSubmit} className="scenarioFormContainer">
            <div className="scenarioSectionHeader">
              <span>Параметры</span>
              <h2>Что проверить</h2>
            </div>

            {errors.submit && (
              <div className="errorMessage">
                <AlertCircle size={16} />
                {errors.submit}
              </div>
            )}

            <FieldBlock
              label="Название сценария"
              required
              hint="Это короткое имя варианта, чтобы потом легко сравнить его с другими. Например: «Без роста», «Быстрее за 8 месяцев», «Осторожный план»."
              error={errors.name}
            >
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Например: Базовый план"
                className={`formInput ${errors.name ? "error" : duplicate ? "warning" : ""}`}
                disabled={loading}
              />
              {duplicate && !errors.name && (
                <div className="warningMessage">
                  <AlertCircle size={12} />
                  Сценарий с названием "{duplicate.name}" уже существует
                </div>
              )}
            </FieldBlock>

            <FieldBlock
              label="Ежемесячный взнос"
              required
              icon={<DollarSign size={14} />}
              hint="Сколько вы планируете добавлять к цели каждый месяц. Именно эта сумма сильнее всего влияет на примерный срок."
              error={errors.monthly_contribution}
            >
              <input
                type="text"
                name="monthly_contribution"
                value={formData.monthly_contribution}
                onChange={handleChange}
                placeholder="15000"
                className={`formInput ${errors.monthly_contribution ? "error" : ""}`}
                disabled={loading}
              />
              {formData.monthly_contribution && (
                <div className="currencyPreview">{formatCurrency(formData.monthly_contribution)} ₽ в месяц</div>
              )}
            </FieldBlock>

            <div className="formRow">
              <FieldBlock
                label="Дополнительный рост"
                icon={<TrendingUp size={14} />}
                hint="Необязательное поле. Если цель пополняется только платежами, оставьте 0. Укажите процент, если хотите проверить, что сумма дополнительно растёт за год."
                error={errors.expected_return}
              >
                <input
                  type="text"
                  name="expected_return"
                  value={formData.expected_return}
                  onChange={handleChange}
                  placeholder="0"
                  className={`formInput ${errors.expected_return ? "error" : ""}`}
                  disabled={loading}
                />
              </FieldBlock>

              <FieldBlock
                label="Ожидаемая инфляция"
                required
                icon={<Activity size={14} />}
                hint="Инфляция показывает, насколько деньги теряют покупательную способность за год. Она уменьшает дополнительный рост в расчёте."
                error={errors.inflation_rate}
              >
                <input
                  type="text"
                  name="inflation_rate"
                  value={formData.inflation_rate}
                  onChange={handleChange}
                  placeholder="6.0"
                  className={`formInput ${errors.inflation_rate ? "error" : ""}`}
                  disabled={loading}
                />
                <button
                  type="button"
                  className="inlineFetchButton"
                  onClick={() => loadCurrentInflation(false)}
                  disabled={loading || inflationLoading}
                >
                  <RefreshCw size={13} />
                  {inflationLoading ? "Загружаем..." : "Подставить актуальную"}
                </button>
                {inflationInfo && <div className="fieldInfoMessage">{inflationInfo}</div>}
              </FieldBlock>
            </div>

            <FieldBlock
              label="Описание"
              hint="Можно оставить пустым. Здесь удобно записать, почему выбран именно такой взнос или рост."
            >
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Например: хочу проверить вариант без дополнительного роста, только регулярные платежи"
                className="formTextarea"
                rows="3"
                disabled={loading}
              />
            </FieldBlock>

            <div className="formButtons">
              <button type="button" onClick={() => navigate(-1)} className="formButton cancelButton" disabled={loading}>
                <X size={14} />
                Отмена
              </button>
              <button type="submit" className="formButton submitButton" disabled={loading || duplicate}>
                <Plus size={14} />
                {loading ? "Создаём..." : "Создать сценарий"}
              </button>
            </div>
          </form>

          <aside className="scenarioResultPanel">
            <div className="scenarioSectionHeader">
              <span>Итог</span>
              <h2>Что получится</h2>
            </div>
            <div className="resultHeroMetric">
              <span>Примерный срок</span>
              <strong>{Number.isFinite(monthsToGoal) ? `${monthsToGoal} мес.` : "Недостижимо"}</strong>
              <small>{Number.isFinite(monthsToGoal) ? `Ориентир: ${formatDate(finishDate)}` : "Увеличьте взнос или снизьте параметры"}</small>
            </div>
            <div className="resultGrid">
              <div><span>Взнос</span><strong>{formatCurrency(formData.monthly_contribution)} ₽</strong></div>
              <div><span>Осталось</span><strong>{formatCurrency(metrics?.remaining || 0)} ₽</strong></div>
              <div><span>Доп. рост</span><strong>{formData.expected_return || 0}%</strong></div>
              <div><span>Инфляция</span><strong>{formData.inflation_rate || 0}%</strong></div>
              <div><span>Рост после инфляции</span><strong>{realGrowth}%</strong></div>
              <div><span>Риск</span><strong className={`riskBadge ${risk.className}`}>{risk.icon}{risk.label}</strong></div>
            </div>
            <div className="resultExplanation">
              <strong>Как читать результат</strong>
              <p>Если дополнительный рост равен 0, срок считается только по текущей сумме и ежемесячному взносу. Если рост больше инфляции, срок может немного сократиться. Если инфляция выше роста, итоговый срок становится осторожнее.</p>
            </div>
          </aside>
        </section>
      </div>
    </Layout>
  );
}

function FieldBlock({ label, hint, icon, required, error, children }) {
  return (
    <div className="formGroup">
      <label className="formLabel">
        {icon}
        {label}
        {required && <span className="required">*</span>}
      </label>
      {hint && <p className="fieldHint">{hint}</p>}
      {children}
      {error && <div className="validationError">{error}</div>}
    </div>
  );
}

function getRiskView(className = "low") {
  if (className === "medium") return { label: "Средний", className: "medium", icon: <Activity size={14} /> };
  if (className === "high") return { label: "Высокий", className: "high", icon: <Zap size={14} /> };
  return { label: "Низкий", className: "low", icon: <Shield size={14} /> };
}

export default CreateScenarioPage;
