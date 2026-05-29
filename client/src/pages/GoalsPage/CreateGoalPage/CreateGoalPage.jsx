import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Calendar,
  Clock,
  CreditCard,
  FileText,
  Plus,
  Sparkles,
  Target,
  Wallet,
  X,
} from "lucide-react";
import Layout from "../../../components/Layout";
import { createGoal } from "../../../api/api";
import "./CreateGoalPage.css";

function CreateGoalPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    title: "",
    target_amount: "",
    monthly_contribution: "",
    initial_amount: "",
    start_date: new Date().toISOString().split("T")[0],
    deadline_date: "",
    description: "",
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

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

    setLoading(true);
    setErrors({});

    try {
      await createGoal({
        user_id: 1,
        title: formData.title,
        target_amount: parseFloat(formData.target_amount),
        monthly_contribution: parseFloat(formData.monthly_contribution),
        initial_amount: parseFloat(formData.initial_amount) || 0,
        start_date: formData.start_date,
        deadline_date: formData.deadline_date || null,
        description: formData.description,
        status: "active",
      });

      setSuccess(true);
      setTimeout(() => navigate("/goals"), 1200);
    } catch (error) {
      console.error("Ошибка создания цели:", error);
      setErrors({ submit: `Ошибка при создании цели: ${error.message}` });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      {loading && (
        <div className="loadingOverlay">
          <div className="goalFormSpinner" />
          <div className="loadingText">Создание цели...</div>
        </div>
      )}

      <div className="goalFormPage createGoalPage">
        <section className="goalFormHero">
          <div>
            <span className="goalFormEyebrow">
              <Sparkles size={16} />
              Новый финансовый маршрут
            </span>
            <h1>Новая финансовая цель</h1>
            <p>Заполните параметры цели, чтобы сразу увидеть стартовый прогресс и ориентир по срокам.</p>
          </div>
          <div className="goalFormPreviewCard">
            <span>Предпросмотр</span>
            <strong>{preview.progress}%</strong>
            <small>{preview.months ? `Около ${preview.months} мес. до цели` : "Добавьте взнос для прогноза"}</small>
          </div>
        </section>

        {success && (
          <div className="successMessage">
            <Plus size={18} />
            Цель успешно создана. Перенаправляем на страницу целей...
          </div>
        )}

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
              <input id="title" name="title" type="text" placeholder="Например: накопить на машину" value={formData.title} onChange={handleChange} className={`formInput ${errors.title ? "formInputError" : ""}`} disabled={loading} />
              {errors.title && <div className="validationError">{errors.title}</div>}
            </div>

            <div className="formRow">
              <div className="formColumn">
                <label htmlFor="target_amount" className="formLabel"><Target size={14} /> Целевая сумма (₽) <span className="required">*</span></label>
                <input id="target_amount" name="target_amount" type="text" placeholder="1 000 000" value={formData.target_amount} onChange={handleChange} className={`formInput ${errors.target_amount ? "formInputError" : ""}`} disabled={loading} />
                {formData.target_amount && <div className="currencyPreview">{formatCurrency(formData.target_amount)} ₽</div>}
                {errors.target_amount && <div className="validationError">{errors.target_amount}</div>}
              </div>

              <div className="formColumn">
                <label htmlFor="monthly_contribution" className="formLabel"><CreditCard size={14} /> Ежемесячный взнос (₽) <span className="required">*</span></label>
                <input id="monthly_contribution" name="monthly_contribution" type="text" placeholder="15 000" value={formData.monthly_contribution} onChange={handleChange} className={`formInput ${errors.monthly_contribution ? "formInputError" : ""}`} disabled={loading} />
                {formData.monthly_contribution && <div className="currencyPreview">{formatCurrency(formData.monthly_contribution)} ₽ в месяц</div>}
                {errors.monthly_contribution && <div className="validationError">{errors.monthly_contribution}</div>}
              </div>
            </div>

            <div className="formRow">
              <div className="formColumn">
                <label htmlFor="initial_amount" className="formLabel"><Wallet size={14} /> Начальная сумма (₽)</label>
                <input id="initial_amount" name="initial_amount" type="text" placeholder="50 000" value={formData.initial_amount} onChange={handleChange} className="formInput" disabled={loading} />
                {formData.initial_amount && <div className="currencyPreview">Уже есть: {formatCurrency(formData.initial_amount)} ₽</div>}
              </div>

              <div className="formColumn">
                <label htmlFor="start_date" className="formLabel"><Calendar size={14} /> Дата начала <span className="required">*</span></label>
                <input id="start_date" name="start_date" type="date" value={formData.start_date} onChange={handleChange} className={`formInput ${errors.start_date ? "formInputError" : ""}`} disabled={loading} />
                {errors.start_date && <div className="validationError">{errors.start_date}</div>}
              </div>
            </div>

            <div className="formGroup fullWidth">
              <label htmlFor="deadline_date" className="formLabel"><Clock size={14} /> Желаемая дата завершения</label>
              <input id="deadline_date" name="deadline_date" type="date" value={formData.deadline_date} onChange={handleChange} className={`formInput ${errors.deadline_date ? "formInputError" : ""}`} min={formData.start_date} disabled={loading} />
              {errors.deadline_date && <div className="validationError">{errors.deadline_date}</div>}
            </div>

            <div className="formGroup fullWidth">
              <label htmlFor="description" className="formLabel"><FileText size={14} /> Описание цели</label>
              <textarea id="description" name="description" placeholder="Опишите детали вашей цели..." value={formData.description} onChange={handleChange} className="formTextarea" disabled={loading} rows="4" />
            </div>

            <div className="formButtons">
              <button type="button" onClick={() => navigate("/goals")} className="formButton cancelButton" disabled={loading}>Отмена</button>
              <button type="submit" disabled={loading} className="formButton submitButton">
                <Plus size={16} />
                {loading ? "Создание..." : "Создать цель"}
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

export default CreateGoalPage;
