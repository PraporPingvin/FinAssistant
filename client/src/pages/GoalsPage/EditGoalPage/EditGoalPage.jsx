import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  AlertCircle,
  Calendar,
  Clock,
  CreditCard,
  FileText,
  Save,
  Sparkles,
  Target,
  Wallet,
  X,
} from "lucide-react";
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
    status: "active",
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (goalId) loadGoal();
  }, [goalId]);

  const loadGoal = async () => {
    try {
      setLoading(true);
      const goalData = await getGoal(goalId);

      if (!goalData) {
        setError("Цель не найдена");
        return;
      }

      setFormData({
        title: goalData.title || "",
        target_amount: goalData.target_amount || "",
        monthly_contribution: goalData.monthly_contribution || "",
        initial_amount: goalData.initial_amount || "0",
        start_date: goalData.start_date ? goalData.start_date.split("T")[0] : "",
        deadline_date: goalData.deadline_date ? goalData.deadline_date.split("T")[0] : "",
        description: goalData.description || "",
        status: goalData.status || "active",
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
    const nextValue = ["target_amount", "monthly_contribution", "initial_amount"].includes(name)
      ? value.replace(/[^\d]/g, "")
      : value;

    setFormData((prev) => ({ ...prev, [name]: nextValue }));

    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.title.trim()) newErrors.title = "Введите название цели";
    if (!formData.target_amount || parseFloat(formData.target_amount) <= 0) {
      newErrors.target_amount = "Введите корректную сумму";
    }
    if (!formData.monthly_contribution || parseFloat(formData.monthly_contribution) <= 0) {
      newErrors.monthly_contribution = "Введите корректный ежемесячный взнос";
    }
    if (!formData.start_date) newErrors.start_date = "Выберите дату начала";
    if (formData.deadline_date && new Date(formData.deadline_date) <= new Date(formData.start_date)) {
      newErrors.deadline_date = "Дата завершения должна быть позже даты начала";
    }

    return newErrors;
  };

  const formatCurrency = (value) => {
    if (!value) return "0";
    return new Intl.NumberFormat("ru-RU").format(parseFloat(value));
  };

  const preview = useMemo(() => {
    const target = parseFloat(formData.target_amount) || 0;
    const initial = parseFloat(formData.initial_amount) || 0;
    const monthly = parseFloat(formData.monthly_contribution) || 0;
    const remaining = Math.max(target - initial, 0);
    const months = monthly > 0 ? Math.ceil(remaining / monthly) : null;
    const progress = target > 0 ? Math.min(100, Math.round((initial / target) * 100)) : 0;
    return { months, progress, remaining };
  }, [formData]);

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
      await updateGoal(goalId, {
        title: formData.title,
        target_amount: parseFloat(formData.target_amount),
        monthly_contribution: parseFloat(formData.monthly_contribution),
        initial_amount: parseFloat(formData.initial_amount) || 0,
        start_date: formData.start_date,
        deadline_date: formData.deadline_date || null,
        status: formData.status,
        description: formData.description,
      });
      navigate(`/goals/${goalId}`);
    } catch (err) {
      console.error("Ошибка обновления цели:", err);
      setErrors({ submit: `Ошибка при обновлении цели: ${err.message}` });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="goalFormLoading">
          <div className="goalFormSpinner" />
          <p>Загрузка данных цели...</p>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="goalFormErrorState">
          <div className="goalFormErrorCard">
            <AlertCircle size={42} />
            <h2>Ошибка</h2>
            <p>{error}</p>
            <button onClick={() => navigate("/goals")} className="backButton">
              Вернуться к списку целей
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="goalFormPage editGoalPage">
        <section className="goalFormHero">
          <div>
            <span className="goalFormEyebrow">
              <Sparkles size={16} />
              Настройка цели
            </span>
            <h1>Редактирование цели</h1>
            <p>Обновите сумму, темп накоплений, сроки и описание финансовой цели.</p>
          </div>
          <div className="goalFormPreviewCard">
            <span>Предпросмотр</span>
            <strong>{preview.progress}%</strong>
            <small>{preview.months ? `Около ${preview.months} мес. до цели` : "Добавьте взнос для прогноза"}</small>
          </div>
        </section>

        {errors.submit && (
          <div className="errorMessage">
            <X size={18} />
            {errors.submit}
          </div>
        )}

        <section className="goalFormShell">
          <form onSubmit={handleSubmit} className="goalFormCard">
            <div className="formGroup fullWidth">
              <label htmlFor="title" className="formLabel">Название цели <span className="required">*</span></label>
              <input id="title" name="title" type="text" placeholder="Например: накопить на машину" value={formData.title} onChange={handleChange} className={`formInput ${errors.title ? "formInputError" : ""}`} disabled={saving} />
              {errors.title && <div className="validationError">{errors.title}</div>}
            </div>

            <div className="formRow">
              <div className="formColumn">
                <label htmlFor="target_amount" className="formLabel"><Target size={14} /> Целевая сумма (₽) <span className="required">*</span></label>
                <input id="target_amount" name="target_amount" type="text" placeholder="1 000 000" value={formData.target_amount} onChange={handleChange} className={`formInput ${errors.target_amount ? "formInputError" : ""}`} disabled={saving} />
                {formData.target_amount && <div className="currencyPreview">{formatCurrency(formData.target_amount)} ₽</div>}
                {errors.target_amount && <div className="validationError">{errors.target_amount}</div>}
              </div>

              <div className="formColumn">
                <label htmlFor="monthly_contribution" className="formLabel"><CreditCard size={14} /> Ежемесячный взнос (₽) <span className="required">*</span></label>
                <input id="monthly_contribution" name="monthly_contribution" type="text" placeholder="15 000" value={formData.monthly_contribution} onChange={handleChange} className={`formInput ${errors.monthly_contribution ? "formInputError" : ""}`} disabled={saving} />
                {formData.monthly_contribution && <div className="currencyPreview">{formatCurrency(formData.monthly_contribution)} ₽ в месяц</div>}
                {errors.monthly_contribution && <div className="validationError">{errors.monthly_contribution}</div>}
              </div>
            </div>

            <div className="formRow">
              <div className="formColumn">
                <label htmlFor="initial_amount" className="formLabel"><Wallet size={14} /> Начальная сумма (₽)</label>
                <input id="initial_amount" name="initial_amount" type="text" placeholder="50 000" value={formData.initial_amount} onChange={handleChange} className="formInput" disabled={saving} />
                {formData.initial_amount && <div className="currencyPreview">Уже есть: {formatCurrency(formData.initial_amount)} ₽</div>}
              </div>

              <div className="formColumn">
                <label htmlFor="start_date" className="formLabel"><Calendar size={14} /> Дата начала <span className="required">*</span></label>
                <input id="start_date" name="start_date" type="date" value={formData.start_date} onChange={handleChange} className={`formInput ${errors.start_date ? "formInputError" : ""}`} disabled={saving} />
                {errors.start_date && <div className="validationError">{errors.start_date}</div>}
              </div>
            </div>

            <div className="formRow">
              <div className="formColumn">
                <label htmlFor="deadline_date" className="formLabel"><Clock size={14} /> Желаемая дата завершения</label>
                <input id="deadline_date" name="deadline_date" type="date" value={formData.deadline_date} onChange={handleChange} className={`formInput ${errors.deadline_date ? "formInputError" : ""}`} min={formData.start_date} disabled={saving} />
                {errors.deadline_date && <div className="validationError">{errors.deadline_date}</div>}
              </div>

              <div className="formColumn">
                <label htmlFor="status" className="formLabel">Статус цели</label>
                <select id="status" name="status" value={formData.status} onChange={handleChange} className="formInput" disabled={saving}>
                  <option value="active">Активна</option>
                  <option value="paused">Приостановлена</option>
                  <option value="completed">Выполнена</option>
                </select>
              </div>
            </div>

            <div className="formGroup fullWidth">
              <label htmlFor="description" className="formLabel"><FileText size={14} /> Описание цели</label>
              <textarea id="description" name="description" placeholder="Опишите детали вашей цели..." value={formData.description} onChange={handleChange} className="formTextarea" disabled={saving} rows="4" />
            </div>

            <div className="formButtons">
              <button type="button" onClick={() => navigate(`/goals/${goalId}`)} className="formButton cancelButton" disabled={saving}>Отмена</button>
              <button type="submit" disabled={saving} className="formButton submitButton">
                <Save size={16} />
                {saving ? "Сохранение..." : "Сохранить изменения"}
              </button>
            </div>
          </form>

          <aside className="goalFormSideCard">
            <span>Финансовая траектория</span>
            <strong>{formatCurrency(preview.remaining)} ₽</strong>
            <p>Осталось до цели с учётом стартовой суммы.</p>
            <div className="miniProgressTrack">
              <div style={{ width: `${preview.progress}%` }} />
            </div>
          </aside>
        </section>
      </div>
    </Layout>
  );
}

export default EditGoalPage;
